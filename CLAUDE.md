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
- **Open a GitHub issue first** — every feature or bug fix starts with a tracked issue before any implementation. Include scope, design, and acceptance criteria. Reference the issue number in branch names and commits.
- **Run tests before finishing** — always verify, never trust blindly
- **All new code and bug fixes MUST have tests** — no exceptions. Bug fixes need a regression test that would have caught the original bug. "Tests pass" ≠ "new code is tested."
- **Data layer changes need their own tests** — don't just mock at the handler level; test the actual functions that touch DynamoDB.
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

## Merge Gate Rules
- **NEVER merge a PR where `Trigger Auto-Fix` job has `conclusion: failure`** — this means the auto-fix pipeline is broken and HIGH/CRITICAL findings were not addressed
- **NEVER merge a PR with unresolved HIGH or CRITICAL AI review findings** — read the review comment, not just the green checkmark
- **ALL CI jobs must be `success` or legitimately `skipped`** — `failure` on any job is a merge blocker, even if the overall workflow appears green
- **NEVER use `gh pr merge --admin`** — if the PR can't merge normally, fix the blocker first
- **NEVER dismiss HIGH/CRITICAL as "false positive" to justify merging** — if it's truly a false positive, document it in a PR comment and add the `no-auto-fix` label, but still get the finding resolved or explicitly acknowledged
- When in doubt: `gh pr view <PR#> --json statusCheckRollup,reviews` and read the actual findings

## Deployment Rules
- **NEVER apply fixes directly to production** (Lambda env vars, configs, etc.)
- **ALL changes go through IaC (CDK)** — commit, PR, review, merge, deploy via pipeline
- Hotfixes are not hotfixes — they get overwritten on next deploy and create drift
- If something is broken in prod, fix it in code and deploy through the pipeline

## PR Merge Rules
- **NEVER merge a PR with unresolved CRITICAL or HIGH findings** — no exceptions
- If the auto-fix agent didn't run or failed, fix manually before merging
- Wait for the review agent to complete and confirm "✅ Ready for Merge" before merging
- If unsure, re-run the review after fixes and verify zero CRITICAL/HIGH findings
