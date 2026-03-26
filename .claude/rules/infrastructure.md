---
description: Rules for CDK infrastructure code
globs: infra/**
---

# Infrastructure Conventions

- One stack per logical grouping (auth, api, frontend, data, location)
- Parameters via SSM Parameter Store or CDK context
- Graviton/ARM64 for all Lambda functions
- Removal policy: RETAIN for DynamoDB tables
- CDK assertions for all stack tests: `cd infra && cdk synth --quiet`

## CodeBuild
- Always use `$CODEBUILD_SRC_DIR` — `cd` doesn't persist between phases
- Never use `|| echo` on critical deploy commands — silently swallows failures
- ARM64 cross-compilation needs `docker buildx` + `binfmt`

## Security
- See `.claude/rules/security.md` for all security prohibitions
- HTTPS everywhere, DynamoDB access scoped by userId
