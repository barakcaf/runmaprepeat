#!/usr/bin/env python3
import aws_cdk as cdk
from stacks.runmaprepeat_stack import RunMapRepeatStack

app = cdk.App()
RunMapRepeatStack(app, "RunMapRepeatStack", env=cdk.Environment(region="us-east-1"))
app.synth()
