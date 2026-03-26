---
description: Rules for Python Lambda backend code
globs: backend/**
---

# Backend Conventions

- Python 3.12+, type hints on all function signatures
- Handlers return `{ statusCode, headers, body }` — body is JSON string
- All DynamoDB access through `data/` layer — never inline in handlers
- Validate Cognito `sub` from JWT for all user-scoped operations
- Use `boto3` resource API where practical, client API for fine control
- Logging via `structlog` or stdlib `logging` — no print statements
- Lambda handlers under ~100 lines — split logic into modules

## DynamoDB
- Always paginate Scans (1MB limit per call)
- `Decimal` → `float` conversion before JSON serialization
- Type N sort keys need actual numbers, not strings

## Testing
- Run: `cd backend && pytest -v`
- Coverage requirements: see CLAUDE.md § Testing Requirements
