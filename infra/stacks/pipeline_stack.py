from aws_cdk import (
    Stack,
    aws_codebuild as codebuild,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as actions,
    aws_iam as iam,
)
from constructs import Construct


class PipelineStack(Stack):
    """CI/CD pipeline for the RunMapRepeat frontend."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        site_bucket_name: str,
        distribution_id: str,
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        build_project = codebuild.PipelineProject(
            self,
            "FrontendBuild",
            build_spec=codebuild.BuildSpec.from_source_filename("buildspec.yml"),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                compute_type=codebuild.ComputeType.SMALL,
                environment_variables={
                    "VITE_USER_POOL_ID": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/user-pool-id",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                    "VITE_USER_POOL_CLIENT_ID": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/user-pool-client-id",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                    "VITE_REGION": codebuild.BuildEnvironmentVariable(
                        value="us-east-1",
                    ),
                    "S3_BUCKET": codebuild.BuildEnvironmentVariable(
                        value=site_bucket_name,
                    ),
                    "DISTRIBUTION_ID": codebuild.BuildEnvironmentVariable(
                        value=distribution_id,
                    ),
                    "VITE_API_URL": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/api-url",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                    "VITE_IDENTITY_POOL_ID": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/identity-pool-id",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                    "TELEGRAM_BOT_TOKEN": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/telegram-bot-token",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                    "TELEGRAM_CHAT_ID": codebuild.BuildEnvironmentVariable(
                        value="/runmaprepeat/telegram-chat-id",
                        type=codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    ),
                },
            ),
        )

        # Grant CodeBuild permissions
        build_project.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameters", "ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/runmaprepeat/*",
                ],
            )
        )
        build_project.add_to_role_policy(
            iam.PolicyStatement(
                actions=["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
                resources=[
                    f"arn:aws:s3:::{site_bucket_name}",
                    f"arn:aws:s3:::{site_bucket_name}/*",
                ],
            )
        )
        build_project.add_to_role_policy(
            iam.PolicyStatement(
                actions=["cloudfront:CreateInvalidation"],
                resources=[
                    f"arn:aws:cloudfront::{self.account}:distribution/{distribution_id}",
                ],
            )
        )

        # Pipeline
        source_output = codepipeline.Artifact("SourceOutput")

        source_action = actions.CodeStarConnectionsSourceAction(
            action_name="GitHub_Source",
            owner="barakcaf",
            repo="runmaprepeat",
            branch="main",
            connection_arn="REDACTED_CONNECTION_ARN",
            output=source_output,
        )

        build_action = actions.CodeBuildAction(
            action_name="Build_and_Deploy",
            project=build_project,
            input=source_output,
        )

        codepipeline.Pipeline(
            self,
            "FrontendPipeline",
            pipeline_name="RunMapRepeat-Frontend-Pipeline",
            pipeline_type=codepipeline.PipelineType.V2,
            triggers=[
                codepipeline.TriggerProps(
                    provider_type=codepipeline.ProviderType.CODE_STAR_SOURCE_CONNECTION,
                    git_configuration=codepipeline.GitConfiguration(
                        source_action=source_action,
                        push_filter=[
                            codepipeline.GitPushFilter(
                                branches_includes=["main"],
                            ),
                        ],
                    ),
                ),
            ],
            stages=[
                codepipeline.StageProps(
                    stage_name="Source",
                    actions=[source_action],
                ),
                codepipeline.StageProps(
                    stage_name="Build",
                    actions=[build_action],
                ),
            ],
        )
