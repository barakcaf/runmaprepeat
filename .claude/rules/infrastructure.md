---
description: Rules for CDK infrastructure code
globs: infra/**
---

# Infrastructure Conventions

- One stack per logical grouping (auth, api, frontend, data, location)
- No hardcoded account IDs, ARNs, or secrets — use SSM Parameter Store or CDK context
- Graviton/ARM64 for all Lambda functions
- Removal policy: RETAIN for DynamoDB tables
- CDK assertions for all stack tests: `cd infra && cdk synth --quiet`

## Security
- NEVER make S3 buckets public — serve through CloudFront only
- NEVER disable Cognito authorizer on API Gateway routes
- NEVER allow self-registration on Cognito user pool
- NEVER use `Principal: "*"` without scoped conditions
- HTTPS everywhere, DynamoDB access scoped by userId

## CodeBuild
- Always use `$CODEBUILD_SRC_DIR` — `cd` doesn't persist between phases
- Never use `|| echo` on critical deploy commands — silently swallows failures
- ARM64 cross-compilation needs `docker buildx` + `binfmt`
