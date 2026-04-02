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


## Deep Expertise

## CI/CD Pipeline Design
- Pipeline stages: lint → unit test → SAST → build → integration test → DAST →
  artifact publish → deploy → smoke test → progressive rollout
- GitHub Actions: reusable workflows, composite actions, OIDC auth to AWS
  (no long-lived access keys), environment protection rules, concurrency controls
- CodePipeline + CodeBuild: artifact caching, cross-account deployment patterns,
  approval gates, notification integration
- Build caching: layer caching for Docker, dependency caching (npm/pip/go)
- Test parallelization and flaky test quarantine

## Deployment Strategies
- **Blue/Green:** zero-downtime, instant rollback, cost of running double capacity
- **Canary:** weighted routing via ALB or API Gateway, auto-promote/rollback
  based on CloudWatch alarms, error rate, and latency metrics
- **Feature flags:** decouple deploy from release (LaunchDarkly, AWS AppConfig)
- **Rolling updates:** ECS/EKS strategy, max unavailable/surge
- **DB migrations:** backward-compatible schema changes, expand-contract pattern,
  blue/green with read replica promotion

## Infrastructure as Code
- **Terraform:** module design, S3+DDB state locking, workspace vs directory,
  Checkov/tfsec scanning, atlantis for PR workflows
- **CDK:** L1/L2/L3 construct selection, aspect-based compliance enforcement,
  CDK Pipelines (self-mutating), stack dependency management
- **CloudFormation:** nested stacks vs stacksets, change set review, drift detection,
  cfn-nag security scanning
- Principles: DRY without over-abstraction, explicit over implicit,
  environments via composition not branching

## Secrets & Supply Chain
- OIDC federation: GitHub Actions → AWS role assumption, no static credentials
- Secrets Manager in pipelines: dynamic retrieval at runtime only
- Image scanning: ECR enhanced scanning (Inspector), Trivy in CI, block on CRITICAL CVEs
- SBOM generation, artifact signing (cosign/sigstore), provenance
- Dependabot / Renovate, auto-merge for patch updates

## Observability as Code
- Dashboards as code: CloudWatch dashboard JSON in IaC
- Alarms as code: composite alarms, anomaly detection
- SLO definition: error budget burn rate alerts (fast burn + slow burn)
- Synthetic canaries: CloudWatch Synthetics for critical user journeys
- Log retention policies, log group encryption

## Cost & Efficiency
- Resource tagging: mandatory via SCPs/Tag Policies, allocation by team/env/service
- Pipeline compute rightsizing, avoid heavy tests on every push
- Spot instances in CI/CD: interruption handling, checkpoint strategies
- ECR lifecycle policies, S3 artifact expiration, CloudWatch log retention
- NAT Gateway costs: $0.045/hr + $0.045/GB — prefer VPC endpoints

## Infrastructure Review Output Format
Prefixes: **[SECURITY]**, **[RELIABILITY]**, **[SPEED]**, **[COST]**, **[MAINTAINABILITY]**
Provide specific YAML / Terraform / CDK code for every recommendation.
