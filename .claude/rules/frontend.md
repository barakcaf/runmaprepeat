---
description: Rules for frontend React/TypeScript code
globs: frontend/**
---

# Frontend Conventions

- Functional components only, hooks for state — no class components
- Strict TypeScript: no `any` unless absolutely necessary
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- CSS modules or inline styles — no CSS-in-JS libraries
- All API calls go through `src/api/` module — never call fetch directly in components
- Error boundaries on route-level components
- Use `const` by default, `let` only when mutation is needed

## Testing
- Run: `cd frontend && npm run test`
- Coverage requirements: see CLAUDE.md § Testing Requirements
