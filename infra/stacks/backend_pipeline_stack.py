"""CDK stack for the backend CI/CD pipeline."""

from aws_cdk import (
    Stack,
    aws_codebuild as codebuild,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as actions,
    aws_iam as iam,
)
from constructs import Construct

CONNECTION_ARN = (
    "arn:aws:codeconnections:us-east-1:REDACTED_ACCOUNT_ID"
    ":connection/REDACTED_CONNECTION_ID"
)


class BackendPipelineStack(Stack):
    """CI/CD pipeline for the RunMapRepeat backend (test + cdk deploy)."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- Test stage project ---
        test_project = codebuild.PipelineProject(
            self,
            "BackendTest",
            project_name="RunMapRepeat-Backend-Test",
            build_spec=codebuild.BuildSpec.from_object(
                {
                    "version": 0.2,
                    "phases": {
                        "install": {
                            "runtime-versions": {"python": "3.12"},
                            "commands": [
                                "cd $CODEBUILD_SRC_DIR/backend && pip install -r requirements.txt 2>/dev/null || true",
                                "pip install pytest moto boto3",
                                "cd $CODEBUILD_SRC_DIR/infra && pip install -r requirements.txt",
                            ],
                        },
                        "build": {
                            "commands": [
                                "echo '--- Backend tests ---'",
                                "cd $CODEBUILD_SRC_DIR/backend && python -m pytest tests/ -v -m 'not integration'",
                                "echo '--- CDK tests ---'",
                                "cd $CODEBUILD_SRC_DIR/infra && python -m pytest tests/ -v",
                            ],
                        },
                    },
                }
            ),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                compute_type=codebuild.ComputeType.SMALL,
            ),
        )

        # --- Deploy stage project ---
        deploy_project = codebuild.PipelineProject(
            self,
            "BackendDeploy",
            project_name="RunMapRepeat-Backend-Deploy",
            build_spec=codebuild.BuildSpec.from_object(
                {
                    "version": 0.2,
                    "phases": {
                        "install": {
                            "runtime-versions": {"python": "3.12", "nodejs": 22},
                            "commands": [
                                "npm install -g aws-cdk",
                                "cd $CODEBUILD_SRC_DIR/infra && pip install -r requirements.txt",
                            ],
                        },
                        "build": {
                            "commands": [
                                "cd $CODEBUILD_SRC_DIR/infra && cdk deploy RunMapRepeat-Data RunMapRepeat-Api --require-approval never",
                            ],
                        },
                    },
                }
            ),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                compute_type=codebuild.ComputeType.SMALL,
            ),
        )

        # CDK deploy needs broad permissions for CloudFormation + resources
        deploy_project.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "cloudformation:*",
                    "lambda:*",
                    "apigateway:*",
                    "dynamodb:*",
                    "iam:*",
                    "s3:*",
                    "ssm:GetParameter",
                    "ssm:GetParameters",
                ],
                resources=["*"],
            )
        )

        # --- Pipeline ---
        source_output = codepipeline.Artifact("SourceOutput")

        source_action = actions.CodeStarConnectionsSourceAction(
            action_name="GitHub_Source",
            owner="barakcaf",
            repo="runmaprepeat",
            branch="main",
            connection_arn=CONNECTION_ARN,
            output=source_output,
        )

        test_action = actions.CodeBuildAction(
            action_name="Test",
            project=test_project,
            input=source_output,
        )

        deploy_action = actions.CodeBuildAction(
            action_name="CDK_Deploy",
            project=deploy_project,
            input=source_output,
        )

        codepipeline.Pipeline(
            self,
            "BackendPipeline",
            pipeline_name="RunMapRepeat-Backend-Pipeline",
            pipeline_type=codepipeline.PipelineType.V2,
            # Auto-trigger handled by WebhookStack (GitHub → API GW → Lambda)
            stages=[
                codepipeline.StageProps(
                    stage_name="Source",
                    actions=[source_action],
                ),
                codepipeline.StageProps(
                    stage_name="Test",
                    actions=[test_action],
                ),
                codepipeline.StageProps(
                    stage_name="Deploy",
                    actions=[deploy_action],
                ),
            ],
        )
