#!/usr/bin/env python3
import aws_cdk as cdk

from stacks.auth_stack import AuthStack
from stacks.frontend_stack import FrontendStack

app = cdk.App()

env = cdk.Environment(region="us-east-1")

AuthStack(app, "RunMapRepeat-Auth", env=env)
FrontendStack(app, "RunMapRepeat-Frontend", env=env)

app.synth()
