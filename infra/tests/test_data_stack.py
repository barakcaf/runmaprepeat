import aws_cdk as cdk
import aws_cdk.assertions as assertions

from stacks.data_stack import DataStack


def test_dynamodb_table_created() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.resource_count_is("AWS::DynamoDB::Table", 1)


def test_table_has_correct_key_schema() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "sk", "KeyType": "RANGE"},
            ],
        },
    )


def test_table_uses_pay_per_request() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {"BillingMode": "PAY_PER_REQUEST"},
    )


def test_table_has_retain_policy() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.has_resource(
        "AWS::DynamoDB::Table",
        {"DeletionPolicy": "Retain"},
    )


def test_table_name() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {"TableName": "RunMapRepeat-Table"},
    )


def test_outputs_exported() -> None:
    app = cdk.App()
    stack = DataStack(app, "TestData")
    template = assertions.Template.from_stack(stack)

    template.has_output("TableName", {})
    template.has_output("TableArn", {})
