import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.pipeline_stack import PipelineStack

SITE_BUCKET = "test-bucket"
DISTRIBUTION_ID = "EXXXXXXXXXX"


def _create_stack() -> assertions.Template:
    app = cdk.App(context={"codeconnection_arn": "arn:aws:codeconnections:us-east-1:123456789012:connection/test-id"})
    stack = PipelineStack(
        app,
        "TestPipeline",
        site_bucket_name=SITE_BUCKET,
        distribution_id=DISTRIBUTION_ID,
        env=cdk.Environment(account="123456789012", region="us-east-1"),
    )
    return assertions.Template.from_stack(stack)


def test_codebuild_project_created() -> None:
    template = _create_stack()
    template.resource_count_is("AWS::CodeBuild::Project", 1)


def test_codebuild_uses_arm64() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::CodeBuild::Project",
        {
            "Environment": {
                "Type": "ARM_CONTAINER",
            },
        },
    )


def test_codebuild_env_vars_use_parameter_store() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::CodeBuild::Project",
        {
            "Environment": {
                "EnvironmentVariables": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "Name": "VITE_USER_POOL_ID",
                                "Type": "PARAMETER_STORE",
                                "Value": "/runmaprepeat/user-pool-id",
                            }
                        ),
                        assertions.Match.object_like(
                            {
                                "Name": "VITE_USER_POOL_CLIENT_ID",
                                "Type": "PARAMETER_STORE",
                                "Value": "/runmaprepeat/user-pool-client-id",
                            }
                        ),
                    ]
                ),
            },
        },
    )


def test_pipeline_created() -> None:
    template = _create_stack()
    template.resource_count_is("AWS::CodePipeline::Pipeline", 1)


def test_pipeline_has_two_stages() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::CodePipeline::Pipeline",
        {
            "Stages": assertions.Match.array_with(
                [
                    assertions.Match.object_like({"Name": "Source"}),
                    assertions.Match.object_like({"Name": "Build"}),
                ]
            ),
        },
    )


def test_codebuild_has_s3_permissions() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "Action": [
                                    "s3:PutObject",
                                    "s3:DeleteObject",
                                    "s3:ListBucket",
                                ],
                                "Effect": "Allow",
                            }
                        ),
                    ]
                ),
            },
        },
    )


def test_codebuild_has_cloudfront_permissions() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "Action": "cloudfront:CreateInvalidation",
                                "Effect": "Allow",
                            }
                        ),
                    ]
                ),
            },
        },
    )


def test_codebuild_has_telegram_env_vars() -> None:
    template = _create_stack()
    template.has_resource_properties(
        "AWS::CodeBuild::Project",
        {
            "Environment": {
                "EnvironmentVariables": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "Name": "TELEGRAM_BOT_TOKEN",
                                "Type": "PARAMETER_STORE",
                                "Value": "/runmaprepeat/telegram-bot-token",
                            }
                        ),
                        assertions.Match.object_like(
                            {
                                "Name": "TELEGRAM_CHAT_ID",
                                "Type": "PARAMETER_STORE",
                                "Value": "/runmaprepeat/telegram-chat-id",
                            }
                        ),
                    ]
                ),
            },
        },
    )
