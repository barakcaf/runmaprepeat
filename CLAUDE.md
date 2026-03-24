# CLAUDE.md — RunMapRepeat

Personal exercise run tracker. Draw routes on a map → distance, pace, calories.

## Architecture
```
CloudFront → S3 (React SPA)
API Gateway (Cognito authorizer) → Lambda (Python) → DynamoDB
AWS Location Service (maps + route calculator)
```

## Build & Test (run these to verify your work)
```bash
# Frontend
cd frontend && npm install && npm run build && npm run test

# Backend
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest -v

# Infrastructure
cd infra && pip install -r requirements.txt && cdk synth --quiet
```

## Key Rules
- **Run tests before finishing** — always verify, never trust blindly
- **Small, focused commits** — conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`
- **Never modify `infra/` without explicit instructions** — infrastructure changes need review
- **Never hardcode** secrets, API keys, account IDs, or ARNs
- **No `any` in TypeScript**, no `print()` in Python — use proper types and logging
- **Ask rather than guess** if requirements are ambiguous

## Project Layout
```
frontend/     React + Vite + TypeScript SPA
  src/components/   UI components (PascalCase.tsx)
  src/api/          API client module
  src/types/        TypeScript types
  src/utils/        Utilities (camelCase.ts)

backend/      Python Lambda handlers
  handlers/         Lambda entry points
  data/             DynamoDB data access layer
  utils/            Shared utilities
  tests/            pytest tests

infra/        AWS CDK (Python)
  stacks/           One stack per logical grouping
```

## Gotchas
- MapLibre `useEffect` for map init must run once (empty deps array)
- DynamoDB returns `Decimal` — convert to `float` before JSON serialization
- `$CODEBUILD_SRC_DIR` required in buildspec.yml — `cd` doesn't persist between phases
- Cognito `sub` from JWT is the userId for all user-scoped DynamoDB operations
- Lambda handlers must return `{ statusCode, headers, body }` — body is always a JSON string
