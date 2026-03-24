"""CDK stack for API Gateway and Lambda functions."""

from aws_cdk import (
    CfnOutput,
    Duration,
    Stack,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
)
from constructs import Construct


class ApiStack(Stack):
    """REST API Gateway with Lambda handlers for RunMapRepeat."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        user_pool: cognito.IUserPool,
        table: dynamodb.ITable,
        **kwargs: object,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Shared Lambda environment
        lambda_env = {
            "TABLE_NAME": table.table_name,
        }

        # Profile handler
        profile_fn = _lambda.Function(
            self,
            "ProfileHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            architecture=_lambda.Architecture.ARM_64,
            handler="handlers.profile.handler",
            code=_lambda.Code.from_asset("../backend"),
            environment=lambda_env,
            timeout=Duration.seconds(10),
        )

        # Runs handler
        runs_fn = _lambda.Function(
            self,
            "RunsHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            architecture=_lambda.Architecture.ARM_64,
            handler="handlers.runs.handler",
            code=_lambda.Code.from_asset("../backend"),
            environment=lambda_env,
            timeout=Duration.seconds(10),
        )

        # Grant DynamoDB access
        table.grant_read_write_data(profile_fn)
        table.grant_read_write_data(runs_fn)

        # Cognito authorizer
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "RunMapRepeatAuthorizer",
            cognito_user_pools=[user_pool],
        )

        auth_method_options = {
            "authorization_type": apigw.AuthorizationType.COGNITO,
            "authorizer": authorizer,
        }

        # REST API
        api = apigw.RestApi(
            self,
            "RunMapRepeatApi",
            rest_api_name="RunMapRepeat API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"],
            ),
        )

        # Profile routes
        profile_resource = api.root.add_resource("profile")
        profile_integration = apigw.LambdaIntegration(profile_fn)
        profile_resource.add_method("GET", profile_integration, **auth_method_options)
        profile_resource.add_method("PUT", profile_integration, **auth_method_options)

        # Runs routes
        runs_resource = api.root.add_resource("runs")
        runs_integration = apigw.LambdaIntegration(runs_fn)
        runs_resource.add_method("GET", runs_integration, **auth_method_options)
        runs_resource.add_method("POST", runs_integration, **auth_method_options)

        run_resource = runs_resource.add_resource("{runId}")
        run_resource.add_method("GET", runs_integration, **auth_method_options)
        run_resource.add_method("PUT", runs_integration, **auth_method_options)
        run_resource.add_method("DELETE", runs_integration, **auth_method_options)

        complete_resource = run_resource.add_resource("complete")
        complete_resource.add_method("POST", runs_integration, **auth_method_options)

        CfnOutput(self, "ApiUrl", value=api.url)
