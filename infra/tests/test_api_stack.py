import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.api_stack import ApiStack
from stacks.auth_stack import AuthStack
from stacks.data_stack import DataStack


def _create_api_stack() -> assertions.Template:
    app = cdk.App()
    auth_stack = AuthStack(app, "TestAuth")
    data_stack = DataStack(app, "TestData")
    api_stack = ApiStack(
        app,
        "TestApi",
        user_pool=auth_stack.user_pool,
        table=data_stack.table,
    )
    return assertions.Template.from_stack(api_stack)


def test_rest_api_created() -> None:
    template = _create_api_stack()
    template.resource_count_is("AWS::ApiGateway::RestApi", 1)


def test_lambda_functions_created() -> None:
    template = _create_api_stack()
    template.resource_count_is("AWS::Lambda::Function", 3)


def test_lambda_uses_arm64() -> None:
    template = _create_api_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Architectures": ["arm64"]},
    )


def test_lambda_uses_python312() -> None:
    template = _create_api_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "python3.12"},
    )


def test_cognito_authorizer_created() -> None:
    template = _create_api_stack()
    template.has_resource_properties(
        "AWS::ApiGateway::Authorizer",
        {"Type": "COGNITO_USER_POOLS"},
    )


def test_api_has_cors() -> None:
    template = _create_api_stack()
    # OPTIONS methods created by CORS config
    template.has_resource_properties(
        "AWS::ApiGateway::Method",
        {"HttpMethod": "OPTIONS"},
    )


def test_api_output_exists() -> None:
    template = _create_api_stack()
    template.has_output("ApiUrl", {})
