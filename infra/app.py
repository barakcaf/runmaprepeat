#!/usr/bin/env python3
import aws_cdk as cdk

from stacks.auth_stack import AuthStack
from stacks.frontend_stack import FrontendStack
from stacks.pipeline_stack import PipelineStack

app = cdk.App()

env = cdk.Environment(region="us-east-1")

AuthStack(app, "RunMapRepeat-Auth", env=env)
FrontendStack(app, "RunMapRepeat-Frontend", env=env)
PipelineStack(
    app,
    "RunMapRepeat-Pipeline",
    site_bucket_name="runmaprepeat-frontend-sitebucket397a1860-rzwkg9dtf8jd",
    distribution_id="E2E3A3QH11PGOS",
    env=env,
)

app.synth()
