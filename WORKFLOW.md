# WORKFLOW.md — RunMapRepeat Development Workflow

## Roles

| Agent | Role |
|-------|------|
| **Loki** | Orchestrator — requirements, spawns engineering team, manages PRs and pipelines |
| **principal-engineer** | Tech lead — designs, reviews, implements. Routes to specialists. |
| **security-engineer** | Security reviews, IAM audits, threat modeling |
| **ux-engineer** | Accessibility, performance, UI/UX reviews |
| **CI (GitHub Actions)** | Tests → principal-engineer review → auto-fix → deploy |

## Development Flow

```
1. Barak requests a feature/fix
2. Loki opens a GitHub issue (scope, design, acceptance criteria)
3. Loki spawns principal-engineer to design (complex) or implement (simple)
4. Implementation on a feature branch → PR opened
5. CI runs automatically:
   Tests → principal-engineer review (Opus) → auto-fix if needed (Opus)
6. On green: Loki merges → CodePipeline deploys → Telegram notification
```

## Branch Strategy

- `main` — production, always deployable
- `feat/*` — features, PR required
- `fix/*` — bug fixes, PR required
- `chore/*` — maintenance, docs, CI

## PR Merge Rules — MANDATORY

**A PR may ONLY be merged when ALL are true:**

1. ✅ All CI jobs passed (success or legitimate skip)
2. ✅ No CRITICAL or HIGH findings from AI review
3. ✅ Auto-Fix job did NOT fail (failure = findings not addressed)
4. ✅ No unresolved review comments

**Never merge if:**
- ❌ `Trigger Auto-Fix` job *failed* (not skipped)
- ❌ AI Review flagged HIGH/CRITICAL with no follow-up fix
- ❌ Any required CI job failed
- ❌ NEVER use `--admin` to bypass merge gates
- ❌ NEVER dismiss HIGH/CRITICAL as "false positives" — add `no-auto-fix` label and document why

**How to check:**
```bash
gh pr view <PR#> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, status, conclusion}'
```

## Deployment Rules

- **ALL changes through IaC (CDK)** — commit, PR, review, merge, deploy via pipeline
- No direct production fixes — they get overwritten on next deploy
- Squash merge preferred, delete branch after merge

## PR Labels

- **`no-auto-fix`** — disables auto-fix cycles (false positives, needs manual intervention)

## Notifications

- PR review results → Telegram
- Pipeline success/failure → EventBridge → Lambda → Telegram + OpenClaw system event
