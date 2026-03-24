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

## Coding Conventions

### Frontend (TypeScript/React)
- Functional components only, hooks for state
- No class components
- Use `const` by default, `let` only when mutation is needed
- Strict TypeScript — no `any` unless absolutely necessary
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- CSS: CSS modules or inline styles (no CSS-in-JS libraries)
- All API calls go through a central `api/` module
- Error boundaries on route-level components

### Backend (Python/Lambda)
- Python 3.12+
- Type hints on all function signatures
- Handlers return `{ statusCode, headers, body }` format
- All DynamoDB access through a data access layer (not inline in handlers)
- Validate Cognito `sub` from JWT for all user-scoped operations
- Use `boto3` resource API where practical, client API for fine control
- Logging via `structlog` or stdlib `logging` — no print statements

### Infrastructure (CDK Python)
- One stack per logical grouping (auth, api, frontend, data, location)
- No hardcoded account IDs, ARNs, or secrets
- Parameters via SSM Parameter Store or CDK context
- Graviton/ARM64 for all Lambda functions
- Always set removal policy to RETAIN for DynamoDB tables

### General
- Every new feature needs tests (unit at minimum)
- No `console.log` or `print` in committed code (use proper logging)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- Branch naming: `feat/description`, `fix/description`, `chore/description`
- Never commit `.env`, `node_modules/`, `__pycache__/`, `cdk.out/`, `dist/`

## Security Rules
- **NEVER** hardcode secrets or credentials — use Secrets Manager or SSM
- **NEVER** make S3 buckets public — serve through CloudFront only
- **NEVER** disable Cognito authorizer on API Gateway routes
- **NEVER** allow self-registration on Cognito user pool
- **NEVER** use `Principal: "*"` in resource policies without scoped conditions
- All API endpoints require authentication
- DynamoDB access scoped by userId (Cognito sub)
- HTTPS everywhere
- Follow SLATS security rules (Global + Internal) for all AWS resources

## Testing
- Frontend: Vitest + React Testing Library + Playwright (E2E)
- Backend: pytest
- Infrastructure: CDK assertions (`aws_cdk.assertions`)
- Tests must pass before merge — enforced by CI

### Coverage Requirements (enforced during code review)
- **All new functionality MUST include tests** — features, bug fixes, refactors. No exceptions.
- **Bug fixes MUST include a regression test** that would have caught the bug before the fix.
- **"Tests pass" is not enough** — reviewers must verify that new/changed code paths are actually covered by tests, not just that existing tests still pass.
- **Frontend:** Every new page/component MUST have Playwright E2E tests covering core user flows + Vitest unit tests for utilities and component rendering.
- **Backend:** Every Lambda handler MUST have pytest coverage for all HTTP methods, success paths, error paths, validation errors, and edge cases. Data layer changes need their own tests (not just handler-level mocks). Aim for >90% handler coverage.
- **PRs without adequate test coverage will be rejected during review.**

## What NOT to Do
- Don't add unnecessary dependencies (check if stdlib or existing deps cover it)
- Don't create IAM users — Cognito only
- Don't use `any` in TypeScript
- Don't skip error handling
- Don't write Lambda handlers longer than ~100 lines — split into modules
- Don't modify CDK-generated resource names manually
