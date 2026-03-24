# CLAUDE.md — Claude Code Instructions for RunMapRepeat

You are a coding agent working on RunMapRepeat, a personal exercise run tracker.

## Read First
- `AGENTS.md` — project conventions and rules (mandatory)
- `frontend/` — React + Vite + TypeScript SPA
- `backend/` — Python Lambda handlers
- `infra/` — CDK Python infrastructure

## Your Role
You implement features, fix bugs, write tests, and refactor code. You do NOT make architecture decisions — those come from the orchestrator (Loki).

## Rules
1. **Follow AGENTS.md strictly** — it defines all conventions
2. **Write tests** for every new feature or bug fix
3. **Run tests before finishing** — `cd frontend && npm test` / `cd backend && pytest`
4. **Small, focused commits** — one logical change per commit
5. **Conventional commits** — `feat:`, `fix:`, `test:`, `chore:`, `docs:`
6. **Never modify infra/ without explicit instructions** — infrastructure changes need review
7. **Never hardcode secrets, API keys, or account IDs**
8. **Ask rather than guess** if requirements are ambiguous

## Patterns

### Adding a Frontend Feature
1. Create component in `frontend/src/components/`
2. Add types in `frontend/src/types/`
3. API integration in `frontend/src/api/`
4. Write tests in `frontend/src/__tests__/` or colocated `.test.tsx`
5. Update routes if needed

### Adding a Backend Endpoint
1. Handler in `backend/handlers/`
2. Data access in `backend/data/`
3. Shared utilities in `backend/utils/`
4. Tests in `backend/tests/`
5. Corresponding CDK changes in `infra/` (if new Lambda/route needed)

### Adding Infrastructure
1. Stack definitions in `infra/stacks/`
2. Use CDK assertions for testing
3. Never use hardcoded account IDs or ARNs
4. Always specify ARM64 architecture for Lambda
