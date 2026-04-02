---
description: PR merge gates, deployment rules, and branch conventions
globs:
  - "**/.github/workflows/**"
  - "**/CLAUDE.md"
  - "**/WORKFLOW.md"
---

# Workflow Rules

## PR Merge Rules — MANDATORY

A PR may ONLY be merged when ALL are true:

1. ✅ All CI jobs passed (success or legitimate skip)
2. ✅ No CRITICAL or HIGH findings from AI review
3. ✅ Auto-Fix job did NOT fail (failure = findings not addressed)
4. ✅ No unresolved review comments

Never merge if:
- ❌ `Trigger Auto-Fix` job *failed* (not skipped)
- ❌ AI Review flagged HIGH/CRITICAL with no follow-up fix
- ❌ Any required CI job failed
- ❌ NEVER use `--admin` to bypass merge gates
- ❌ NEVER dismiss HIGH/CRITICAL as "false positives" — add `no-auto-fix` label and document why

## Deployment Rules

- ALL changes through IaC (CDK) — commit, PR, review, merge, deploy via pipeline
- No direct production fixes — they get overwritten on next deploy
- Squash merge preferred, delete branch after merge

## Branch Strategy

- `main` — production, always deployable
- `feat/*` — features, PR required
- `fix/*` — bug fixes, PR required
- `chore/*`, `docs/*` — maintenance

## PR Labels

- `no-auto-fix` — disables auto-fix cycles (false positives, needs manual intervention)
