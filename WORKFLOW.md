# WORKFLOW.md — RunMapRepeat Development Workflow

## Agent Roles

| Agent | Role | Triggers |
|-------|------|----------|
| **Loki** | Orchestrator — architecture, requirements, DevOps, code review oversight, spawns agents | Barak's requests, PR review notifications, pipeline events |
| **Claude Code** | Coding agent — implements features, fixes bugs, writes tests, addresses PR feedback | Spawned by Loki with specific task instructions |
| **CI (GitHub Actions)** | Runs tests, posts results, notifies Loki | GitHub Action on every PR open/update |

## Development Flow

```
1. Barak requests a feature/fix
        ↓
2. Loki opens a GitHub issue describing the scope, design, and acceptance criteria
        ↓
3. Loki breaks it into tasks, spawns Claude Code (referencing the issue number)
        ↓
4. Claude Code implements on a feature branch, commits + pushes
        ↓
5. Loki opens PR (or Claude Code does via gh cli)
        ↓
6. GitHub Actions runs tests automatically, notifies Loki via Telegram
        ↓
7. Loki reviews the PR:
   - Reads the diff (gh pr diff)
   - Checks test results
   - Reviews against project standards
   - Posts: APPROVE / REQUEST_CHANGES / COMMENT on the PR
        ↓
8a. If APPROVE → Loki merges (or notifies Barak for manual merge)
8b. If REQUEST_CHANGES → Loki spawns Claude Code to fix
        ↓
9. Claude Code pushes fixes to same branch
        ↓
10. CI re-runs tests, Loki re-reviews (back to step 6)
        ↓
11. On merge → CodePipeline deploys → Telegram notification
```

## Branch Strategy
- `main` — production, always deployable
- `feat/*` — feature branches, PR required to merge
- `fix/*` — bug fix branches, PR required to merge
- `chore/*` — maintenance, docs, CI changes

## PR Merge Rules — MANDATORY

**A PR may ONLY be merged when ALL of the following are true:**

1. ✅ All CI jobs passed — every job must show `success` or `skipped` (legitimate skip only)
2. ✅ No CRITICAL or HIGH findings from AI Code Review
3. ✅ Auto-Fix job did NOT fail — `failure` means findings were NOT addressed. Investigate first.
4. ✅ No unresolved review comments requesting changes

**Explicit blockers (never merge if any of these are true):**
- ❌ `Trigger Auto-Fix` job failed (not skipped — *failed*)
- ❌ AI Review flagged HIGH/CRITICAL with no follow-up fix
- ❌ Any required CI job failed (even if `continue-on-error` made the workflow green)
- ❌ NEVER use `--admin` to bypass merge gates
- ❌ NEVER rationalize HIGH/CRITICAL findings as "false positives" to justify merging — add `no-auto-fix` label and document why, but still fix or acknowledge

**How to check:**
```bash
gh pr view <PR#> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, status, conclusion}'
gh pr view <PR#> --json reviews --jq '.reviews[] | select(.author.login=="github-actions") | .body'
```

## Deployment Rules
- **NEVER apply fixes directly to production** (Lambda env vars, configs, etc.)
- **ALL changes go through IaC (CDK)** — commit, PR, review, merge, deploy via pipeline
- Hotfixes are not hotfixes — they get overwritten on next deploy and create drift
- If something is broken in prod, fix it in code and deploy through the pipeline

### General PR rules
- All PRs require passing PR Review workflow
- No direct pushes to `main` (except initial setup)
- Squash merge preferred
- Delete branch after merge

### PR Labels
- **`no-auto-fix`** — Disables automatic fix attempts by Claude Code. Add this label when:
  - AI review findings are false positives
  - Findings require manual intervention or architectural decisions
  - You want to prevent auto-fix cycles from running

## Notifications
- PR review results → GitHub webhook → Telegram
- Pipeline success/failure → EventBridge → Lambda → Telegram
- All notifications include links to the PR/pipeline for quick action
