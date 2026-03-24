# WORKFLOW.md — RunMapRepeat Development Workflow

## Agent Roles

| Agent | Role | Triggers |
|-------|------|----------|
| **Loki** | Orchestrator — architecture, requirements, DevOps, code review oversight, spawns agents | Barak's requests, PR review notifications, pipeline events |
| **Claude Code** | Coding agent — implements features, fixes bugs, writes tests, addresses PR feedback | Spawned by Loki with specific task instructions |
| **PR Review Agent** | Automated reviewer — checks quality, tests, security, conventions | GitHub Action on every PR open/update |

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
5. PR Review Agent runs automatically:
   - Runs tests (frontend, backend, CDK)
   - Reviews diff against project standards
   - Posts: APPROVE / REQUEST_CHANGES / COMMENT
        ↓
6a. If APPROVE → Loki merges (or notifies Barak for manual merge)
6b. If REQUEST_CHANGES → Loki reads feedback, spawns Claude Code to fix
        ↓
7. Claude Code pushes fixes to same branch
        ↓
8. PR Review Agent re-reviews (back to step 5)
        ↓
9. On merge → CodePipeline deploys → Telegram notification
```

## Branch Strategy
- `main` — production, always deployable
- `feat/*` — feature branches, PR required to merge
- `fix/*` — bug fix branches, PR required to merge
- `chore/*` — maintenance, docs, CI changes

## PR Rules
- All PRs require passing PR Review Agent
- No direct pushes to `main` (except initial setup)
- Squash merge preferred
- Delete branch after merge

## Notifications
- PR review results → GitHub webhook → Telegram
- Pipeline success/failure → EventBridge → Lambda → Telegram
- All notifications include links to the PR/pipeline for quick action
