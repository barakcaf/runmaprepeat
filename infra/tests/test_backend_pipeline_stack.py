"""Tests for BackendPipelineStack."""

import aws_cdk as cdk
from aws_cdk import assertions

from stacks.backend_pipeline_stack import BackendPipelineStack


def test_backend_pipeline_created() -> None:
    app = cdk.App(context={"codeconnection_arn": "arn:aws:codeconnections:us-east-1:123456789012:connection/test-id"})
    stack = BackendPipelineStack(
        app,
        "TestBackendPipeline",
        env=cdk.Environment(account="123456789012", region="us-east-1"),
    )
    template = assertions.Template.from_stack(stack)

    # Pipeline exists
    template.resource_count_is("AWS::CodePipeline::Pipeline", 1)

    # Three stages: Source, Test, Deploy
    template.has_resource_properties(
        "AWS::CodePipeline::Pipeline",
        {
            "Stages": assertions.Match.array_with(
                [
                    assertions.Match.object_like({"Name": "Source"}),
                    assertions.Match.object_like({"Name": "Test"}),
                    assertions.Match.object_like({"Name": "Deploy"}),
                ]
            ),
        },
    )

    # Two CodeBuild projects (test + deploy)
    template.resource_count_is("AWS::CodeBuild::Project", 2)


def test_deploy_project_has_iam_permissions() -> None:
    app = cdk.App(context={"codeconnection_arn": "arn:aws:codeconnections:us-east-1:123456789012:connection/test-id"})
    stack = BackendPipelineStack(
        app,
        "TestBackendPipeline",
        env=cdk.Environment(account="123456789012", region="us-east-1"),
    )
    template = assertions.Template.from_stack(stack)

    # At least one IAM policy with cloudformation:*
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "Action": assertions.Match.array_with(
                                    ["cloudformation:*"]
                                ),
                            }
                        ),
                    ]
                ),
            },
        },
    )
