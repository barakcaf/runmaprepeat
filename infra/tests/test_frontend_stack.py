import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.frontend_stack import FrontendStack


def test_s3_bucket_created() -> None:
    app = cdk.App()
    stack = FrontendStack(app, "TestFrontend")
    template = assertions.Template.from_stack(stack)

    template.resource_count_is("AWS::S3::Bucket", 1)


def test_s3_bucket_not_public() -> None:
    app = cdk.App()
    stack = FrontendStack(app, "TestFrontend")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            },
        },
    )


def test_cloudfront_distribution_created() -> None:
    app = cdk.App()
    stack = FrontendStack(app, "TestFrontend")
    template = assertions.Template.from_stack(stack)

    template.resource_count_is("AWS::CloudFront::Distribution", 1)


def test_cloudfront_default_root_object() -> None:
    app = cdk.App()
    stack = FrontendStack(app, "TestFrontend")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "DefaultRootObject": "index.html",
            },
        },
    )
