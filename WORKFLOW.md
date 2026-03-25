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
2. Loki breaks it into tasks, spawns Claude Code
        ↓
3. Claude Code implements on a feature branch, commits + pushes
        ↓
4. Loki opens PR (or Claude Code does via gh cli)
        ↓
5. GitHub Actions runs tests automatically, notifies Loki via Telegram
        ↓
6. Loki reviews the PR:
   - Reads the diff (gh pr diff)
   - Checks test results
   - Reviews against project standards (AGENTS.md)
   - Posts: APPROVE / REQUEST_CHANGES / COMMENT on the PR
        ↓
7a. If APPROVE → Loki merges (or notifies Barak for manual merge)
7b. If REQUEST_CHANGES → Loki spawns Claude Code to fix
        ↓
8. Claude Code pushes fixes to same branch
        ↓
9. CI re-runs tests, Loki re-reviews (back to step 5)
        ↓
10. On merge → CodePipeline deploys → Telegram notification
```

## Branch Strategy
- `main` — production, always deployable
- `feat/*` — feature branches, PR required to merge
- `fix/*` — bug fix branches, PR required to merge
- `chore/*` — maintenance, docs, CI changes

## PR Merge Rules — MANDATORY

**A PR may ONLY be merged when ALL of the following are true:**

1. ✅ **All CI jobs passed** — every job in the workflow must show `conclusion: success` or `conclusion: skipped` (legitimate skip only)
2. ✅ **No CRITICAL or HIGH findings** from AI Code Review — if the review flagged HIGH or CRITICAL, they must be resolved first
3. ✅ **Auto-Fix job did NOT fail** — if `Trigger Auto-Fix` has `conclusion: failure`, that means the fix pipeline is broken and findings were NOT addressed. **DO NOT MERGE.** Investigate the failure first.
4. ✅ **No unresolved review comments** requesting changes

**Explicit blockers (never merge if any of these are true):**
- ❌ `Trigger Auto-Fix` job failed (not skipped — *failed*). This means HIGH findings exist but auto-fix couldn't run. Treat as a merge blocker.
- ❌ AI Review flagged HIGH/CRITICAL and no follow-up fix commit addressed them
- ❌ Any required CI job failed (even if `continue-on-error` made the workflow green)
- ❌ **NEVER use `--admin` to bypass merge gates** — if the PR can't merge normally, fix the issue first
- ❌ **NEVER rationalize HIGH/CRITICAL findings as "false positives" to justify merging** — if you believe it's a false positive, add the `no-auto-fix` label and document why in a PR comment, but still fix or explicitly acknowledge the finding before merging

**How to check before merging:**
```bash
# Verify all jobs — look for conclusion: failure on ANY job
gh pr view <PR#> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, status, conclusion}'

# Read the AI review comment for severity levels
gh pr view <PR#> --json reviews --jq '.reviews[] | select(.author.login=="github-actions") | .body'
```

### General PR rules
- All PRs require passing PR Review workflow
- No direct pushes to `main` (except initial setup)
- Squash merge preferred
- Delete branch after merge

## Notifications
- PR review results → GitHub webhook → Telegram
- Pipeline success/failure → EventBridge → Lambda → Telegram
- All notifications include links to the PR/pipeline for quick action
