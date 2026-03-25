#!/usr/bin/env python3
import aws_cdk as cdk

from stacks.api_stack import ApiStack
from stacks.auth_stack import AuthStack
from stacks.backend_pipeline_stack import BackendPipelineStack
from stacks.data_stack import DataStack
from stacks.frontend_stack import FrontendStack
from stacks.pipeline_stack import PipelineStack
from stacks.webhook_stack import WebhookStack

app = cdk.App()

env = cdk.Environment(region="us-east-1")

auth_stack = AuthStack(app, "RunMapRepeat-Auth", env=env)
FrontendStack(app, "RunMapRepeat-Frontend", env=env)
data_stack = DataStack(app, "RunMapRepeat-Data", env=env)

ApiStack(
    app,
    "RunMapRepeat-Api",
    user_pool=auth_stack.user_pool,
    table=data_stack.table,
    env=env,
)

PipelineStack(
    app,
    "RunMapRepeat-Pipeline",
    site_bucket_name="runmaprepeat-frontend-sitebucket397a1860-rzwkg9dtf8jd",
    distribution_id="E2E3A3QH11PGOS",
    env=env,
)

BackendPipelineStack(app, "RunMapRepeat-Backend-Pipeline", env=env)

WebhookStack(app, "RunMapRepeat-Webhook", env=env)

app.synth()
