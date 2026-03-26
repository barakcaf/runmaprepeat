# AGENTS.md — RunMapRepeat

## Project Overview
Personal exercise run tracker. Users draw routes on an interactive map, the app calculates distance, pace, and calories. Aggregated stats per week/month.

## Tech Stack
- **Frontend:** React + Vite + TypeScript
- **Backend:** Python Lambda handlers behind API Gateway
- **Infrastructure:** AWS CDK (Python)
- **Database:** DynamoDB
- **Maps:** AWS Location Service + MapLibre GL JS
- **Auth:** Amazon Cognito (admin-created users only)
- **CI/CD:** CodePipeline + CodeBuild
- **Hosting:** S3 + CloudFront

## Architecture
```
CloudFront → S3 (React SPA)
API Gateway (Cognito authorizer) → Lambda (Python) → DynamoDB
AWS Location Service (maps + route calculator)
```

## Conventions
- **Coding rules:** see CLAUDE.md and `.claude/rules/`
- **Workflow & merge rules:** see WORKFLOW.md
- **Security:** see `.claude/rules/security.md`
- **Testing requirements:** see CLAUDE.md § Testing Requirements

### General (all agents)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- Branch naming: `feat/description`, `fix/description`, `chore/description`
- Never commit `.env`, `node_modules/`, `__pycache__/`, `cdk.out/`, `dist/`
- Don't add unnecessary dependencies — check if stdlib or existing deps cover it
- Ask rather than guess if requirements are ambiguous

## What NOT to Do
- Don't create IAM users — Cognito only
- Don't skip error handling
- Don't modify CDK-generated resource names manually
- Don't use `any` in TypeScript
- Don't use `print()` in Python — use proper logging
- For security prohibitions, see `.claude/rules/security.md`
