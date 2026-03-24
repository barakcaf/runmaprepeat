import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.auth_stack import AuthStack


def test_user_pool_created() -> None:
    app = cdk.App()
    stack = AuthStack(app, "TestAuth")
    template = assertions.Template.from_stack(stack)

    template.resource_count_is("AWS::Cognito::UserPool", 1)


def test_self_signup_disabled() -> None:
    app = cdk.App()
    stack = AuthStack(app, "TestAuth")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::Cognito::UserPool",
        {
            "AdminCreateUserConfig": {
                "AllowAdminCreateUserOnly": True,
            },
        },
    )


def test_user_pool_client_created_without_secret() -> None:
    app = cdk.App()
    stack = AuthStack(app, "TestAuth")
    template = assertions.Template.from_stack(stack)

    template.resource_count_is("AWS::Cognito::UserPoolClient", 1)
    template.has_resource_properties(
        "AWS::Cognito::UserPoolClient",
        {
            "GenerateSecret": False,
        },
    )


def test_password_policy() -> None:
    app = cdk.App()
    stack = AuthStack(app, "TestAuth")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::Cognito::UserPool",
        {
            "Policies": {
                "PasswordPolicy": {
                    "MinimumLength": 8,
                    "RequireLowercase": True,
                    "RequireUppercase": True,
                    "RequireNumbers": True,
                    "RequireSymbols": True,
                },
            },
        },
    )
