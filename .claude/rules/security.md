---
description: AWS security rules — mandatory for all code changes
globs: "**"
---

# Security Rules (SLATS) — NEVER Violate These

These are hard blockers. If a fix would violate any rule, skip it and explain why.

## Resource Policies
- NEVER use `"Principal": "*"` without scoped conditions (aws:PrincipalOrgID, aws:SourceAccount, etc.)
- NEVER create public S3 buckets (read or write) — serve through CloudFront
- NEVER create Lambda function URLs with `AuthType: NONE`
- NEVER create SQS/SNS/KMS/Secrets Manager policies open to `"Principal": "*"`

## IAM
- NEVER create IAM users with console login — use federated access
- NEVER enable root account access keys
- NEVER use `ForAllValues` on single-valued condition keys (returns true when key absent)
- NEVER use policy variables (`${aws:...}`) in trust policies — use literal values
- NEVER rely on IP address conditions alone to restrict role access

## Data Protection
- NEVER make EBS/RDS snapshots or EC2 AMIs public
- NEVER hardcode secrets, API keys, account IDs, or ARNs in source code
- NEVER store credentials in environment variables as plaintext — use Secrets Manager or SSM Parameter Store
- NEVER disable encryption at rest (DynamoDB, S3, EBS, RDS)

## Cognito
- NEVER allow self-registration on Cognito user pools — admin-only registration
- NEVER allow unauthenticated identity pool access without scoped-down permissions
- NEVER disable Cognito authorizer on API Gateway routes

## Network
- NEVER open SSH (port 22) to 0.0.0.0/0 — use SSM Session Manager
- NEVER create security groups with unrestricted ingress (0.0.0.0/0) on sensitive ports
- NEVER expose internal services directly — use ALB/CloudFront with proper security groups

## API Gateway
- NEVER deploy API Gateway without authorization (Cognito, IAM, or Lambda authorizer)
- NEVER enable API Gateway execute-api endpoint when using custom domains — disable it
