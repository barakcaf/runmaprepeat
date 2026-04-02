# CLAUDE.md — RunMapRepeat

Personal exercise run tracker. Draw routes on a map → distance, pace, calories.

## Build & Test (run these to verify your work)

**Always run the full test suite first** to establish a baseline before making changes.

```bash
# Frontend
cd frontend && npm install && npm run build && npm run test

# Backend
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest -v

# Infrastructure
cd infra && pip install -r requirements.txt && cdk synth --quiet
```

## Workflow
- **Open a GitHub issue first** — every feature or bug fix starts with a tracked issue. Include scope, design, and acceptance criteria. Reference the issue number in branch names and commits.
- **Plan before code** — explore → plan → implement → verify. Complex changes need a planning phase; trivial changes can skip it.
- **Small, focused commits** — conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`
- **Red/green TDD** — for bug fixes, write a failing test first (red), then implement the fix (green). For features, tests must fail without the implementation.
- **Manual verification** — after tests pass, start the server and exercise changes with curl or a browser build to catch integration issues tests miss
- **Merge and deployment rules** — see WORKFLOW.md

## Testing Requirements
- **All new code and bug fixes MUST have tests** — no exceptions. Bug fixes need a regression test that would have caught the original bug.
- **"Tests pass" ≠ "new code is tested"** — reviewers verify new/changed code paths are actually covered.
- **Frontend:** Every new page/component needs Playwright E2E tests for core user flows + Vitest unit tests for utilities and rendering.
- **Backend:** Every handler needs pytest coverage for all HTTP methods, success/error/validation/edge cases. Data layer changes need their own tests (not just handler-level mocks). Target >90% handler coverage.
- **PRs without adequate test coverage will be rejected during review.**

## Key Rules
- **Never modify `infra/` without explicit instructions** — infrastructure changes need review
- **Never hardcode** secrets, API keys, account IDs, or ARNs — see `.claude/rules/security.md`
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
