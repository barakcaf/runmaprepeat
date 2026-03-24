from aws_cdk import (
    CfnOutput,
    Stack,
    aws_cognito as cognito,
    aws_ssm as ssm,
)
from constructs import Construct


class AuthStack(Stack):
    """Cognito User Pool for RunMapRepeat authentication."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs: object) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.user_pool = cognito.UserPool(
            self,
            "RunMapRepeatUserPool",
            user_pool_name="runmaprepeat-users",
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
        )

        self.user_pool_client = self.user_pool.add_client(
            "RunMapRepeatSPAClient",
            user_pool_client_name="runmaprepeat-spa",
            generate_secret=False,
            auth_flows=cognito.AuthFlow(
                user_srp=True,
                custom=False,
                user_password=False,
                admin_user_password=False,
            ),
            prevent_user_existence_errors=True,
        )

        ssm.StringParameter(
            self,
            "UserPoolIdParam",
            parameter_name="/runmaprepeat/user-pool-id",
            string_value=self.user_pool.user_pool_id,
        )
        ssm.StringParameter(
            self,
            "UserPoolClientIdParam",
            parameter_name="/runmaprepeat/user-pool-client-id",
            string_value=self.user_pool_client.user_pool_client_id,
        )

        CfnOutput(self, "UserPoolId", value=self.user_pool.user_pool_id)
        CfnOutput(
            self,
            "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
        )
