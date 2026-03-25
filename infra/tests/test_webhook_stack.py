import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.webhook_stack import WebhookStack


def _create_webhook_stack() -> assertions.Template:
    app = cdk.App()
    stack = WebhookStack(app, "TestWebhook")
    return assertions.Template.from_stack(stack)


def test_lambda_created() -> None:
    template = _create_webhook_stack()
    template.resource_count_is("AWS::Lambda::Function", 1)


def test_lambda_uses_arm64() -> None:
    template = _create_webhook_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Architectures": ["arm64"]},
    )


def test_lambda_uses_python312() -> None:
    template = _create_webhook_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "python3.12"},
    )


def test_api_gateway_created() -> None:
    template = _create_webhook_stack()
    template.resource_count_is("AWS::ApiGateway::RestApi", 1)


def test_webhook_post_method() -> None:
    template = _create_webhook_stack()
    template.has_resource_properties(
        "AWS::ApiGateway::Method",
        {"HttpMethod": "POST"},
    )


def test_ssm_parameter_created() -> None:
    template = _create_webhook_stack()
    template.resource_count_is("AWS::SSM::Parameter", 1)
