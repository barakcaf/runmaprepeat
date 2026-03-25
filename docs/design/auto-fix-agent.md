# Design Doc: Auto-Fix Agent — Full Implementation

**Issue:** [#73](https://github.com/barakcaf/runmaprepeat/issues/73)
**Depends on:** [#57](https://github.com/barakcaf/runmaprepeat/issues/57) (AI Code Review Agent)
**Author:** Loki (AI assistant)
**Date:** 2026-03-25
**Status:** Draft — Pending Review

---

## 1. Executive Summary

After the AI code review agent posts findings on a PR, an auto-fix agent automatically attempts to resolve them. It uses the official `anthropics/claude-code-action@v1` GitHub Action with Amazon Bedrock (Sonnet 4) via OIDC federation — no Anthropic API key required. The fix agent reads project steering docs (CLAUDE.md, AGENTS.md), edits code, runs tests, and pushes a fix commit that triggers a re-review cycle. The review agent uses Opus 4.6 for high-quality analysis; the fix agent uses Sonnet 4 for cost-efficient code edits.

---

## 2. Architecture Overview

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions Runner (ubuntu-latest)       │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ Job 1:   │    │ Job 2:   │    │ Job 3:            │  │
│  │ test     │───▶│ review   │───▶│ fix               │  │
│  │          │    │          │    │                   │  │
│  │ vitest   │    │ script + │    │ claude-code-action│  │
│  │ pytest   │    │ bedrock  │    │ @v1               │  │
│  │ cdk test │    │ Opus 4.6 │    │ + bedrock OIDC    │  │
│  │          │    │          │    │ Sonnet 4          │  │
│  └──────────┘    └──────────┘    └─────────┬─────────┘  │
│                                            │            │
└────────────────────────────────────────────┼────────────┘
                                             │
                    ┌────────────────────────┐│
                    │                        ▼│
              ┌─────┴──────┐          ┌──────────────┐
              │  Amazon    │          │   GitHub     │
              │  Bedrock   │          │   API        │
              │  Opus 4.6  │          │   (push +    │
              │  (OIDC)    │          │    comment)  │
              └────────────┘          └──────────────┘
```

### 2.2 End-to-End Flow

```
PR opened / push
         │
         ▼
┌─────────────────────┐
│  Job 1: test        │
│  All suites pass?   │
└─────────┬───────────┘
          │
     No ──┤──── Yes
     │         │
     ▼         ▼
   ❌ Stop  ┌──────────────────┐
            │  Job 2: review   │
            │  (AI Code Review)│
            └─────────┬────────┘
                      │
              Has findings?
               │          │
              No         Yes
               │          │
               ▼          ▼
          ✅ Ready   ┌───────────────────────────────┐
          for Merge  │  Job 3: fix                   │
                     │                               │
                     │  1. Check cycle count          │
                     │     (max 2, from commit msg)   │
                     │                               │
                     │  2. claude-code-action@v1      │
                     │     - use_bedrock: true        │
                     │     - OIDC auth (same role)    │
                     │     - Reads CLAUDE.md          │
                     │     - Model: Opus 4.6          │
                     │     - Prompt: fix findings     │
                     │     - Can edit + run tests     │
                     │                               │
                     │  3. Push fix commit            │
                     │     (via GitHub App token)     │
                     │                               │
                     │  4. Telegram notification      │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                           Push triggers new cycle:
                           test → review → resolve
                                     │
                              Cycle ≤ 2?
                               │       │
                              Yes      No
                               │       │
                               ▼       ▼
                         Continue    Stop + alert
                         cycle       human via TG
```

---

## 3. Key Technical Decision: Why `claude-code-action` over CLI

| Factor | `claude-code-action@v1` | Raw Claude Code CLI |
|--------|------------------------|-------------------|
| Bedrock OIDC | Native support (`use_bedrock: "true"`) | Manual env vars (`CLAUDE_CODE_USE_BEDROCK=1`) |
| GitHub integration | Built-in (push, comment, file ops) | Manual git commands |
| Steering docs | Auto-reads CLAUDE.md | Auto-reads CLAUDE.md |
| Agentic loop | Full (edit, shell, tests) | Full (edit, shell, tests) |
| Install step | None (pre-packaged action) | `npm i -g @anthropic-ai/claude-code` |
| Maintenance | Anthropic maintains it | We maintain wrapper script |
| Progress tracking | Visual checkboxes on PR | None |
| Structured output | JSON results as GH Action outputs | Manual parsing |

**Decision: Use `claude-code-action@v1`** — less code to maintain, native Bedrock OIDC, built-in GitHub integration.

---

## 4. Implementation Details

### 4.1 GitHub App Token (Critical)

**Problem:** `GITHUB_TOKEN` commits do NOT trigger new workflow runs. This is a GitHub security feature to prevent infinite loops. But our cycle depends on fix commit → re-trigger test → review.

**Solution:** Use a GitHub App to generate tokens. Commits made with a GitHub App token DO trigger workflows.

#### GitHub App Setup

1. Create a GitHub App (one-time, in Barak's GitHub account):
   - **Name:** `runmaprepeat-autofix` (or similar)
   - **Permissions:**
     - Contents: Read & write
     - Pull requests: Read & write
     - Metadata: Read-only
   - **Install on:** `barakcaf/runmaprepeat`
   
2. Store credentials as repo secrets:
   - `APP_ID` — the GitHub App's numeric ID
   - `APP_PRIVATE_KEY` — the App's private key (PEM format)

3. In the workflow, generate a token:
   ```yaml
   - name: Generate GitHub App token
     id: app-token
     uses: actions/create-github-app-token@v2
     with:
       app-id: ${{ secrets.APP_ID }}
       private-key: ${{ secrets.APP_PRIVATE_KEY }}
   ```

**Alternative:** Use a Personal Access Token (PAT). Simpler setup but less secure (broad scope, tied to Barak's account, no expiry management). **GitHub App is recommended.**

### 4.2 Workflow File: Updated `pr-review.yml`

The full workflow with all three jobs:

```yaml
name: PR Tests & Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: write          # Fix agent needs to push
  pull-requests: write     # Post reviews and comments
  checks: write            # Test results
  id-token: write          # OIDC federation for Bedrock

jobs:
  # ================================================================
  # Job 1: Run all test suites
  # ================================================================
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Run frontend tests
        id: frontend-tests
        working-directory: frontend
        run: npm test -- --run 2>&1 | tee /tmp/frontend-test-output.txt
        continue-on-error: true

      - name: Install backend dependencies
        working-directory: backend
        run: |
          pip install -r requirements.txt 2>/dev/null || true
          pip install pytest moto boto3

      - name: Run backend tests
        id: backend-tests
        working-directory: backend
        run: pytest --tb=short 2>&1 | tee /tmp/backend-test-output.txt
        continue-on-error: true

      - name: Install CDK dependencies
        working-directory: infra
        run: pip install -r requirements.txt

      - name: Run CDK tests
        id: cdk-tests
        working-directory: infra
        run: pytest --tb=short 2>&1 | tee /tmp/cdk-test-output.txt
        continue-on-error: true

      - name: Post test results on PR
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const frontend = '${{ steps.frontend-tests.outcome }}';
            const backend = '${{ steps.backend-tests.outcome }}';
            const cdk = '${{ steps.cdk-tests.outcome }}';
            const icon = (s) => s === 'success' ? '✅' : s === 'failure' ? '❌' : '⚠️';

            const body = `## 🧪 Test Results\n\n` +
              `| Suite | Status |\n|-------|--------|\n` +
              `| Frontend | ${icon(frontend)} ${frontend} |\n` +
              `| Backend | ${icon(backend)} ${backend} |\n` +
              `| CDK | ${icon(cdk)} ${cdk} |\n`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body,
            });

      - name: Notify via Telegram
        if: always()
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          PR_TITLE="${{ github.event.pull_request.title }}"
          PR_NUMBER="${{ github.event.pull_request.number }}"
          PR_URL="${{ github.event.pull_request.html_url }}"
          PR_AUTHOR="${{ github.event.pull_request.user.login }}"
          FRONTEND="${{ steps.frontend-tests.outcome }}"
          BACKEND="${{ steps.backend-tests.outcome }}"
          CDK="${{ steps.cdk-tests.outcome }}"

          MESSAGE="🔍 <b>PR Review Needed</b>: #${PR_NUMBER} — ${PR_TITLE}%0ABy: ${PR_AUTHOR}%0ATests: Frontend=${FRONTEND} Backend=${BACKEND} CDK=${CDK}%0A<a href=\"${PR_URL}\">Review PR</a>"

          if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
            curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
              -d chat_id="${TELEGRAM_CHAT_ID}" \
              -d text="$MESSAGE" \
              -d parse_mode="HTML" \
              -d disable_web_page_preview="true"
          fi

      - name: Gate — fail if any tests failed
        if: always()
        run: |
          if [ "${{ steps.frontend-tests.outcome }}" = "failure" ] || \
             [ "${{ steps.backend-tests.outcome }}" = "failure" ] || \
             [ "${{ steps.cdk-tests.outcome }}" = "failure" ]; then
            echo "❌ One or more test suites failed"
            exit 1
          fi
          echo "✅ All tests passed"

  # ================================================================
  # Job 2: AI Code Review (only if tests pass)
  # ================================================================
  review:
    name: AI Code Review
    needs: test
    runs-on: ubuntu-latest
    if: github.actor != 'dependabot[bot]'
    outputs:
      has_findings: ${{ steps.run-review.outputs.has_findings }}
      findings_json: ${{ steps.run-review.outputs.findings_json }}
      findings_summary: ${{ steps.run-review.outputs.findings_summary }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_ARN }}
          aws-region: us-east-1

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install boto3

      - name: Run AI review
        id: run-review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_NAME: ${{ github.repository }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: python .github/scripts/ai_review.py

  # ================================================================
  # Job 3: Auto-Fix (only if review found issues, max 2 cycles)
  # ================================================================
  fix:
    name: Auto-Fix Findings
    needs: review
    runs-on: ubuntu-latest
    if: >
      needs.review.outputs.has_findings == 'true' &&
      github.actor != 'dependabot[bot]' &&
      !contains(github.event.pull_request.labels.*.name, 'no-auto-fix')

    steps:
      # --- Cycle detection ---
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          fetch-depth: 5

      - name: Check cycle count
        id: cycle
        run: |
          LAST_MSG=$(git log -1 --pretty=%s)
          echo "Last commit: $LAST_MSG"

          if [[ "$LAST_MSG" == *"[ai-fix-cycle-2]"* ]]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "⛔ Max fix cycles (2) reached — stopping"
          elif [[ "$LAST_MSG" == *"[ai-fix-cycle-1]"* ]]; then
            echo "cycle=2" >> "$GITHUB_OUTPUT"
            echo "skip=false" >> "$GITHUB_OUTPUT"
            echo "🔄 Fix cycle 2/2"
          else
            echo "cycle=1" >> "$GITHUB_OUTPUT"
            echo "skip=false" >> "$GITHUB_OUTPUT"
            echo "🔄 Fix cycle 1/2"
          fi

      - name: Notify max cycles reached
        if: steps.cycle.outputs.skip == 'true'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          PR_NUMBER="${{ github.event.pull_request.number }}"
          PR_URL="${{ github.event.pull_request.html_url }}"
          MESSAGE="⚠️ <b>Auto-Fix Limit Reached</b> — PR #${PR_NUMBER}%0AMax 2 fix cycles completed. Remaining findings need manual review.%0A<a href=\"${PR_URL}\">View PR</a>"
          if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
            curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
              -d chat_id="${TELEGRAM_CHAT_ID}" \
              -d text="$MESSAGE" \
              -d parse_mode="HTML" \
              -d disable_web_page_preview="true"
          fi

      # --- AWS + GitHub App auth ---
      - name: Configure AWS credentials (OIDC)
        if: steps.cycle.outputs.skip != 'true'
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_ARN }}
          aws-region: us-east-1

      - name: Generate GitHub App token
        if: steps.cycle.outputs.skip != 'true'
        id: app-token
        uses: actions/create-github-app-token@v2
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      # --- Run Claude Code to fix findings ---
      - name: Auto-fix with Claude Code
        if: steps.cycle.outputs.skip != 'true'
        uses: anthropics/claude-code-action@v1
        with:
          use_bedrock: "true"
          prompt: |
            You are an auto-fix agent. Fix the following code review findings
            in this repository. After fixing each issue, run the test suites
            to verify nothing is broken:

            - Frontend: cd frontend && npm ci && npm test -- --run
            - Backend: cd backend && pip install pytest moto boto3 && pytest --tb=short
            - CDK: cd infra && pip install -r requirements.txt && pytest --tb=short

            RULES:
            - Fix the source code, NOT the tests
            - If a fix breaks tests, revert that specific fix
            - Only keep fixes where all tests still pass
            - Follow the project conventions in CLAUDE.md and AGENTS.md
            - For CRITICAL findings, add a code comment explaining the fix

            FINDINGS (cycle ${{ steps.cycle.outputs.cycle }}/2):

            ${{ needs.review.outputs.findings_summary }}
          claude_args: |
            --model us.anthropic.claude-sonnet-4-20250514-v1:0
            --max-turns 30
          timeout_minutes: 15
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          AWS_REGION: us-east-1

      # --- Commit and push fixes ---
      - name: Push fixes
        if: steps.cycle.outputs.skip != 'true'
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          CYCLE="${{ steps.cycle.outputs.cycle }}"

          # Configure git with App identity
          git config user.name "runmaprepeat-autofix[bot]"
          git config user.email "runmaprepeat-autofix[bot]@users.noreply.github.com"

          # Check for changes
          if git diff --quiet && git diff --cached --quiet; then
            echo "No changes to commit"
            exit 0
          fi

          # Stage, commit, push
          git add -A
          git commit -m "fix: auto-resolve review findings [ai-fix-cycle-${CYCLE}]"
          git push origin HEAD:${{ github.head_ref }}
          echo "✅ Fix commit pushed (cycle ${CYCLE}/2)"

      # --- Telegram notification ---
      - name: Notify fix result
        if: always() && steps.cycle.outputs.skip != 'true'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          PR_NUMBER="${{ github.event.pull_request.number }}"
          PR_URL="${{ github.event.pull_request.html_url }}"
          CYCLE="${{ steps.cycle.outputs.cycle }}"

          # Check if we actually pushed changes
          LAST_MSG=$(git log -1 --pretty=%s)
          if [[ "$LAST_MSG" == *"[ai-fix-cycle-"* ]]; then
            STATUS="✅ Fixes pushed"
          else
            STATUS="⚠️ No fixes applied"
          fi

          MESSAGE="🔧 <b>Auto-Fix Agent</b> — PR #${PR_NUMBER} (cycle ${CYCLE}/2)%0A${STATUS}%0A<a href=\"${PR_URL}\">View PR</a>"
          if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
            curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
              -d chat_id="${TELEGRAM_CHAT_ID}" \
              -d text="$MESSAGE" \
              -d parse_mode="HTML" \
              -d disable_web_page_preview="true"
          fi
```

### 4.3 Review Script Changes (`ai_review.py`)

The review script needs to output findings for the fix job. Add these lines at the end of `main()`:

```python
# Write findings as GitHub Actions output for fix job
github_output = os.environ.get("GITHUB_OUTPUT", "")
if github_output:
    with open(github_output, "a") as f:
        # Boolean flag: does the fix job need to run?
        has_actionable = any(
            finding.get("severity") in ("CRITICAL", "HIGH", "MEDIUM")
            for finding in findings
        )
        f.write(f"has_findings={'true' if has_actionable else 'false'}\n")

        # JSON array of findings (for structured consumption)
        f.write(f"findings_json<<FINDINGS_EOF\n")
        f.write(json.dumps(findings, indent=2))
        f.write(f"\nFINDINGS_EOF\n")

        # Human-readable summary (for claude-code-action prompt)
        summary_lines = []
        for i, finding in enumerate(findings, 1):
            sev = finding.get("severity", "LOW")
            title = finding.get("title", "Issue")
            body = finding.get("body", "")
            file_path = finding.get("file", "")
            line = finding.get("line", "?")
            suggestion = finding.get("suggestion", "")

            entry = f"{i}. [{sev}] {title}\n"
            entry += f"   File: {file_path}:{line}\n"
            entry += f"   Issue: {body}\n"
            if suggestion:
                entry += f"   Suggested fix:\n   {suggestion}\n"
            summary_lines.append(entry)

        f.write(f"findings_summary<<SUMMARY_EOF\n")
        f.write("\n".join(summary_lines))
        f.write(f"\nSUMMARY_EOF\n")
```

### 4.4 Steering Docs

Claude Code Action automatically reads `CLAUDE.md` from the repo root. Our existing `CLAUDE.md` already contains:

- Project architecture and tech stack
- Coding conventions (ARM64, stdlib-only Lambda, etc.)
- Test requirements (Vitest, pytest, CDK tests)
- Commit message conventions
- What NOT to do (no hardcoded secrets, no `node_modules/`, etc.)

The auto-fix agent inherits all of this automatically. **No additional steering docs needed.**

The prompt in the workflow also explicitly tells the agent:
- Which test commands to run
- To fix source code, not tests
- To revert if tests break
- To follow CLAUDE.md and AGENTS.md

---

## 5. Cycle Management

### 5.1 How Cycles Work

```
                    ┌───────────────────────────────────┐
                    │         Normal PR Flow             │
                    │                                   │
Human pushes ──────▶ test ─▶ review ─▶ findings? ──────┤
                    │                     │        No   │
                    │                     │  ┌──────────┘
                    │                     ▼  ▼
                    │                   ✅ Ready for Merge
                    │                     │
                    │                    Yes (has findings)
                    │                     │
                    │                     ▼
                    │            fix (cycle 1) ──push──┐
                    │                                  │
                    │  ┌───────────────────────────────┘
                    │  │
                    │  ▼  (push triggers new run)
                    │  test ─▶ review ─▶ findings? ────┤
                    │                     │        No   │
                    │                     │  ┌──────────┘
                    │                     ▼  ▼
                    │                   ✅ Ready for Merge
                    │                     │
                    │                    Yes (still has findings)
                    │                     │
                    │                     ▼
                    │            fix (cycle 2) ──push──┐
                    │                                  │
                    │  ┌───────────────────────────────┘
                    │  │
                    │  ▼  (push triggers new run)
                    │  test ─▶ review ─▶ findings? ────┤
                    │                     │        No   │
                    │                     │  ┌──────────┘
                    │                     ▼  ▼
                    │                   ✅ Ready for Merge
                    │                     │
                    │                    Yes (STILL has findings)
                    │                     │
                    │                     ▼
                    │           fix job SKIPS (cycle > 2)
                    │           Telegram: "human review needed"
                    └───────────────────────────────────┘
```

### 5.2 Cycle Detection Logic

```
Read HEAD commit message:
  - Contains "[ai-fix-cycle-2]" → SKIP fix job entirely
  - Contains "[ai-fix-cycle-1]" → Run fix job as cycle 2
  - Neither                      → Run fix job as cycle 1
```

This is intentionally simple — no external state, no labels to manage, no API calls. The cycle count is embedded in the git history.

### 5.3 Why Not Labels?

Labels require API calls to add/read/remove, can be manually modified causing confusion, and add complexity. Commit messages are:
- Immutable once pushed
- Visible in git log
- Automatically available to the workflow
- No additional API calls needed

---

## 6. Authentication & Permissions

### 6.1 Secrets Required

| Secret | Purpose | Already exists? |
|--------|---------|----------------|
| `AWS_OIDC_ROLE_ARN` | Bedrock access via OIDC | ✅ Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications | ✅ Yes |
| `TELEGRAM_CHAT_ID` | Telegram chat | ✅ Yes |
| `APP_ID` | GitHub App for push | ❌ New |
| `APP_PRIVATE_KEY` | GitHub App for push | ❌ New |

### 6.2 IAM Role

Reuse existing `github-actions-ai-review` role. Current permissions already cover Converse + InvokeModel for Claude models. **No IAM changes needed.**

### 6.3 GitHub App Permissions

| Scope | Level | Why |
|-------|-------|-----|
| Contents | Read & write | Push fix commits |
| Pull requests | Read & write | Read findings, post comments |
| Metadata | Read-only | Required default |

### 6.4 Why GitHub App Token for Push?

GitHub Actions security prevents `GITHUB_TOKEN` commits from triggering new workflow runs. This is intentional to prevent infinite loops. Since our cycle depends on:

```
fix commit → push → triggers test → review → (maybe another fix)
```

We need a token that DOES trigger workflows. Options:

| Method | Triggers workflows? | Security | Setup |
|--------|-------------------|----------|-------|
| `GITHUB_TOKEN` | ❌ No | Best (scoped to run) | None |
| Personal Access Token | ✅ Yes | Worse (broad scope, no expiry) | Create PAT, add secret |
| **GitHub App token** | **✅ Yes** | **Good (scoped, auto-expires)** | **Create App, add secrets** |

**GitHub App is the right choice.** Scoped permissions, auto-expiring tokens, not tied to a personal account.

---

## 7. Safety & Guardrails

| Guardrail | Implementation | Notes |
|-----------|---------------|-------|
| **Max 2 fix cycles** | Commit message tag detection | Prevents infinite loops |
| **Tests must pass** | Claude Code runs tests; push step checks for changes | No blind pushes |
| **No test modification** | Prompt instruction + CLAUDE.md convention | Agent told not to edit test files |
| **No force-push** | Regular `git push` only | Preserves review history |
| **CRITICAL flagging** | Prompt asks agent to add code comments for CRITICAL fixes | Human always reviews these |
| **PR branch only** | `pull_request` event context | Never runs on `main` |
| **Timeout** | `timeout_minutes: 15` on claude-code-action | Kills runaway agent |
| **Max turns** | `--max-turns 30` | Limits agentic loop iterations |
| **Human escape hatch** | `no-auto-fix` label skips fix job | Manual override |
| **Revert on failure** | Agent prompted to revert individual fixes that break tests | Partial fixes are safe |
| **Token scoping** | GitHub App token scoped to repo + auto-expires | Minimal blast radius |

### 7.1 What If the Fix Agent Introduces Bugs?

1. Agent runs tests → if they fail, fix is reverted before push
2. Push triggers test job → if tests fail, review doesn't run, fix doesn't run → loop stops
3. Worst case: fix passes tests but introduces a subtle bug → **that's why "Ready for Merge" requires human approval**, the bot never auto-merges

### 7.2 What If Bedrock Is Down?

- `claude-code-action` step fails
- Fix job fails (non-zero exit)
- Telegram notification: "⚠️ No fixes applied"
- Next human push will trigger a fresh cycle
- Review from Job 2 already posted — findings are visible regardless

---

## 8. Cost Estimate

### Per Fix Run

| Component | Tokens | Cost |
|-----------|--------|------|
| Input (steering docs + code + findings) | ~15-30K | ~$0.50-1.00 |
| Output (edits + test runs + reasoning) | ~5-15K | ~$0.50-1.50 |
| Total per fix run | | **~$1-3** |

### Monthly Estimate (5-10 PRs/week)

| Scenario | Fix runs/month | Monthly cost |
|----------|---------------|-------------|
| Most PRs clean (20% need fixes) | 8-16 | $8-48 |
| Half need fixes | 20-40 | $20-120 |
| Every PR needs fixes | 40-80 | $40-240 |

**Note:** Using Sonnet 4 (not Opus) for the fix agent keeps costs ~5x lower than Opus while still being highly capable for code edits. Opus is reserved for the review agent where reasoning quality matters most.

### Combined Monthly (Review + Fix)

| Component | Estimate |
|-----------|----------|
| Review agent (Opus 4.6) | $15-25 |
| Fix agent (Sonnet 4) | $8-48 |
| **Total** | **$23-73** |

---

## 9. Implementation Plan

### Phase 1: Prerequisites (30 min)
- [ ] Create GitHub App `runmaprepeat-autofix`
- [ ] Install on `barakcaf/runmaprepeat`
- [ ] Store `APP_ID` and `APP_PRIVATE_KEY` as repo secrets

### Phase 2: Review Script Changes (1 hour)
- [ ] Add `has_findings`, `findings_json`, `findings_summary` outputs to `ai_review.py`
- [ ] Test output format with a real review run

### Phase 3: Fix Job (2-3 hours)
- [ ] Add `fix` job to `pr-review.yml` with full configuration
- [ ] Implement cycle detection
- [ ] Configure `claude-code-action` with Bedrock OIDC
- [ ] Add Telegram notifications
- [ ] Test on a real PR with known findings

### Phase 4: Validation (1 hour)
- [ ] Verify fix commit triggers re-review cycle
- [ ] Verify cycle limit (2 max) stops correctly
- [ ] Verify `no-auto-fix` label skips fix job
- [ ] Verify Telegram notifications at each stage
- [ ] Verify "✅ Ready for Merge" after successful fix cycle

---

## 10. Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **claude-code-action + Bedrock** | Official, maintained, native OIDC, full agentic | Needs GitHub App for push | ✅ Selected |
| Claude Code CLI + Bedrock | More control, simpler auth | Manual git, no progress tracking | Close second |
| Raw Bedrock Converse API | Cheapest, simplest | No shell, no tests, no steering docs | Too limited |
| claude-code-action + Anthropic API | Simplest setup | Needs API key, separate billing | Extra credential |
| Loki-driven (heartbeat) | Most flexible | Not instant, depends on heartbeat timing | Good for CRITICAL |

---

## 11. Open Questions

1. **GitHub App name:** `runmaprepeat-autofix` or something more generic for future repos?
2. **Max turns:** 30 seems reasonable for most fixes. Too high? Too low?

---

## Appendix A: Environment Variables Reference

### claude-code-action inputs

| Input | Value | Purpose |
|-------|-------|---------|
| `use_bedrock` | `"true"` | Enable Bedrock provider |
| `prompt` | Findings + instructions | What the agent should do |
| `claude_args` | `--model ... --max-turns ...` | CLI arguments |
| `timeout_minutes` | `15` | Max runtime |

### Environment variables

| Variable | Value | Set by |
|----------|-------|--------|
| `GITHUB_TOKEN` | App token | `create-github-app-token` step |
| `AWS_REGION` | `us-east-1` | Explicit in workflow |
| `AWS_ACCESS_KEY_ID` | (auto) | `configure-aws-credentials` step |
| `AWS_SECRET_ACCESS_KEY` | (auto) | `configure-aws-credentials` step |
| `AWS_SESSION_TOKEN` | (auto) | `configure-aws-credentials` step |

### GitHub Actions outputs from review job

| Output | Type | Example |
|--------|------|---------|
| `has_findings` | `"true"` / `"false"` | `"true"` |
| `findings_json` | JSON array | `[{"severity":"HIGH",...}]` |
| `findings_summary` | Human-readable text | `1. [HIGH] Missing validation...` |
