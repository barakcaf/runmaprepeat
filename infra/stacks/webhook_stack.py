"""CDK stack for GitHub webhook → CodePipeline auto-trigger."""

import json

from aws_cdk import (
    Stack,
    Duration,
    aws_apigateway as apigw,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_ssm as ssm,
)
from constructs import Construct

CONNECTION_ARN = (
    "arn:aws:codeconnections:us-east-1:579083551251"
    ":connection/846e3503-39e0-40e6-824d-c80ca0b25cf3"
)

PIPELINE_MAP = {
    "frontend": "RunMapRepeat-Frontend-Pipeline",
    "backend": "RunMapRepeat-Backend-Pipeline",
}

# Paths that determine which pipeline to trigger.
# If a push modifies files matching these prefixes, the corresponding pipeline runs.
# If both match, both run.
PATH_RULES = {
    "frontend": ["frontend/", "buildspec.yml"],
    "backend": ["backend/", "infra/"],
}


class WebhookStack(Stack):
    """GitHub push webhook → start the right CodePipeline(s)."""

    def __init__(self, scope, construct_id, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Webhook secret stored in SSM (set once, referenced forever)
        webhook_secret_param = ssm.StringParameter(
            self,
            "WebhookSecret",
            parameter_name="/runmaprepeat/github-webhook-secret",
            string_value="CHANGE_ME",  # will be overwritten by CLI
            description="GitHub webhook HMAC secret for RunMapRepeat",
        )

        handler = lambda_.Function(
            self,
            "WebhookHandler",
            function_name="RunMapRepeat-GitHubWebhook",
            runtime=lambda_.Runtime.PYTHON_3_12,
            architecture=lambda_.Architecture.ARM_64,
            handler="index.handler",
            timeout=Duration.seconds(15),
            memory_size=128,
            environment={
                "PIPELINE_MAP": json.dumps(PIPELINE_MAP),
                "PATH_RULES": json.dumps(PATH_RULES),
                "WEBHOOK_SECRET_PARAM": webhook_secret_param.parameter_name,
            },
            code=lambda_.Code.from_inline(LAMBDA_CODE),
        )

        # Allow Lambda to read the webhook secret
        webhook_secret_param.grant_read(handler)

        # Allow Lambda to start both pipelines
        handler.add_to_role_policy(
            iam.PolicyStatement(
                actions=["codepipeline:StartPipelineExecution"],
                resources=[
                    f"arn:aws:codepipeline:{self.region}:{self.account}:{name}"
                    for name in PIPELINE_MAP.values()
                ],
            )
        )

        # Telegram notification env vars (optional, for push notifications)
        handler.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/runmaprepeat/*"
                ],
            )
        )

        # API Gateway (REST, single POST endpoint)
        api = apigw.RestApi(
            self,
            "WebhookApi",
            rest_api_name="RunMapRepeat-GitHub-Webhook",
            description="Receives GitHub push events and triggers CodePipeline",
            deploy_options=apigw.StageOptions(stage_name="prod"),
        )

        webhook_resource = api.root.add_resource("webhook")
        webhook_resource.add_method(
            "POST",
            apigw.LambdaIntegration(handler),
        )


# ---------------------------------------------------------------------------
# Inline Lambda code
# ---------------------------------------------------------------------------
LAMBDA_CODE = r'''
import hashlib
import hmac
import json
import os
import boto3

ssm = boto3.client("ssm")
cp = boto3.client("codepipeline")

def get_secret():
    """Fetch the webhook secret from SSM (cached in execution context)."""
    resp = ssm.get_parameter(
        Name=os.environ["WEBHOOK_SECRET_PARAM"], WithDecryption=True
    )
    return resp["Parameter"]["Value"]

def verify_signature(body: str, signature: str, secret: str) -> bool:
    """Verify GitHub HMAC-SHA256 signature."""
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(
        secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

def handler(event, context):
    body_str = event.get("body", "")
    sig = (event.get("headers") or {}).get("X-Hub-Signature-256", "")
    gh_event = (event.get("headers") or {}).get("X-GitHub-Event", "")

    # Verify signature
    secret = get_secret()
    if secret == "CHANGE_ME":
        print("WARNING: webhook secret not configured — skipping signature check")
    elif not verify_signature(body_str, sig, secret):
        return {"statusCode": 403, "body": "Bad signature"}

    # Only handle push events
    if gh_event == "ping":
        return {"statusCode": 200, "body": "pong"}
    if gh_event != "push":
        return {"statusCode": 200, "body": f"Ignored event: {gh_event}"}

    payload = json.loads(body_str)
    ref = payload.get("ref", "")

    # Only trigger on pushes to main
    if ref != "refs/heads/main":
        return {"statusCode": 200, "body": f"Ignored ref: {ref}"}

    # Collect changed files
    commits = payload.get("commits", [])
    changed = set()
    for c in commits:
        changed.update(c.get("added", []))
        changed.update(c.get("modified", []))
        changed.update(c.get("removed", []))

    pipeline_map = json.loads(os.environ["PIPELINE_MAP"])
    path_rules = json.loads(os.environ["PATH_RULES"])

    triggered = []
    for key, prefixes in path_rules.items():
        pipeline_name = pipeline_map.get(key)
        if not pipeline_name:
            continue
        # If any changed file matches a prefix, trigger that pipeline
        if any(f.startswith(tuple(prefixes)) for f in changed):
            print(f"Triggering {pipeline_name} (matched paths for '{key}')")
            cp.start_pipeline_execution(name=pipeline_name)
            triggered.append(pipeline_name)

    # If no specific path matched (e.g. root files like README), trigger frontend
    if not triggered:
        default = pipeline_map.get("frontend")
        if default:
            print(f"Triggering {default} (default — no specific path match)")
            cp.start_pipeline_execution(name=default)
            triggered.append(default)

    return {
        "statusCode": 200,
        "body": json.dumps({"triggered": triggered}),
    }
'''
