# Design Doc: AI Code Review Agent for RunMapRepeat

**Issue:** [#57](https://github.com/barakcaf/runmaprepeat/issues/57)
**Author:** Loki (AI assistant)
**Date:** 2026-03-24
**Status:** Draft

---

## Executive Summary

This document proposes adding an automated AI code review bot to the RunMapRepeat project. The bot will review pull requests using an LLM (Claude via Amazon Bedrock), post inline comments and a summary on each PR, and integrate via a lightweight GitHub Actions workflow. The goal is to catch bugs, enforce project conventions, and reduce review burden — not to replace human review, but to augment it.

Given that RunMapRepeat is a small personal project (React frontend + Python Lambda backend + CDK infra), the approach favors simplicity: a single GitHub Actions workflow using the open-source `coderabbitai/ai-pr-reviewer` action or a custom lightweight script calling Bedrock, rather than a paid SaaS or complex self-hosted service.

---

## 1. Research Findings

### 1.1 How Teams Use LLMs for Code Review

The dominant pattern is: **on PR open/update → fetch diff → send diff + context to LLM → post comments back to PR**. Key learnings from the field:

- **Greptile's data** (2.2M+ PRs reviewed): 69.5% of PRs have at least one issue flagged. 48% of flagged issues are logic errors, not style/syntax. Comments rated helpful by developers: 58%. ([greptile.com/blog/ai-code-review](https://www.greptile.com/blog/ai-code-review))
- **Separation of concerns matters**: The tool that generates code should NOT be the same tool that reviews it. Shared assumptions = shared blind spots. Independent review catches what self-review misses.
- **Noise is the #1 killer**: If every PR gets a wall of comments, developers ignore them within a week. Confidence scoring and filtering are critical.
- **Cross-file context is where AI shines**: Single-file linting is table stakes. The real value is catching logic issues that span multiple files — something humans do poorly under time pressure.

### 1.2 Existing Solutions Comparison

| Tool | Type | Cost | Approach | Pros | Cons |
|------|------|------|----------|------|------|
| **GitHub Copilot Code Review** | Built-in | Copilot subscription | Select "Copilot" as reviewer; auto-review option available | Zero setup, native GitHub UX, custom instructions via `.github/copilot-instructions.md` (4K char limit) | Only "Comment" reviews (no approve/block), can repeat dismissed comments on re-review, limited customization |
| **CodeRabbit** | SaaS | Free for OSS, paid for private | GitHub App, deep codebase indexing, learns from feedback | Excellent context awareness, inline suggestions, conversation support, IDE + CLI integration | External SaaS dependency, data leaves your repo |
| **CodeRabbit ai-pr-reviewer** | Open-source Action | API costs only | GitHub Action, uses OpenAI API, light + heavy model split | Self-hosted, customizable prompts, incremental reviews, ~$20/day for 20-dev team with GPT-4 | Maintenance burden, OpenAI-only (no Bedrock), repo archived/maintenance mode |
| **ChatGPT-CodeReview (anc95)** | Open-source Action | API costs only | GitHub Action, sends patch to OpenAI, posts review comments | Simple setup, configurable prompt/model/language, file pattern filtering | Basic — no incremental review, no context beyond diff, OpenAI-only |
| **Greptile** | SaaS | Paid | Full codebase indexing, confidence scoring, agentic review | Deep context, confidence scores (63% safe vs 37% needs attention), catches cross-file bugs | Paid SaaS, external data processing |
| **Sourcery** | SaaS + Action | Free tier | AST-aware analysis + LLM review | Good for Python, respects code structure | Limited language support, less useful for CDK/React |
| **Custom script (DIY)** | Self-hosted | API costs only | GitHub Action → fetch diff → call Bedrock/Claude → post comments | Full control, use Bedrock (no external API keys), project-specific prompts | Build + maintain yourself |

**Sources:**
- GitHub Copilot Code Review docs: [docs.github.com](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review)
- CodeRabbit ai-pr-reviewer: [github.com/coderabbitai/ai-pr-reviewer](https://github.com/coderabbitai/ai-pr-reviewer)
- ChatGPT-CodeReview: [github.com/anc95/ChatGPT-CodeReview](https://github.com/anc95/ChatGPT-CodeReview)
- Greptile blog: [greptile.com/blog/ai-code-review](https://www.greptile.com/blog/ai-code-review)

### 1.3 Prompt Engineering for Code Review

What makes a good code review prompt:

1. **Role definition**: "You are a senior developer reviewing a pull request for [project description]."
2. **Project context**: Tech stack, conventions, known patterns. For RunMapRepeat: React + TypeScript frontend, Python Lambda backend, CDK infra, CodeBuild CI/CD.
3. **Structured output**: Ask for categorized feedback (bugs, security, performance, style) with severity levels.
4. **Specificity over generality**: "Check Lambda handlers for proper error handling and DynamoDB pagination" beats "review this code."
5. **Negative examples**: "Do NOT comment on formatting, import order, or trivial naming preferences."
6. **Context window management**: Send the diff + relevant file context, not the entire repo. For large PRs, chunk by file and summarize.

**Key anti-patterns to avoid:**
- Sending raw diff without file context → hallucinated function signatures
- Asking for "all issues" → noise explosion
- No severity levels → everything looks equally important
- No project-specific rules → generic advice that doesn't apply

### 1.4 What to Automate vs Leave to Humans

**Good for AI review:**
- Logic bugs (missing error handling, off-by-one, race conditions)
- Security issues (hardcoded secrets, SQL injection, overly permissive IAM)
- CDK/CloudFormation anti-patterns (public S3 buckets, missing encryption)
- Python Lambda gotchas (cold start issues, missing pagination, timeout risks)
- React anti-patterns (missing dependency arrays in useEffect, prop drilling)
- Convention violations (project-specific patterns documented in AGENTS.md)
- Missing tests for new functionality

**Leave to humans:**
- Architecture decisions
- UX/design choices
- Business logic correctness (does this feature do what users want?)
- Trade-off discussions (performance vs readability)
- Whether a feature should exist at all

### 1.5 Integration Patterns

| Pattern | How | Pros | Cons |
|---------|-----|------|------|
| **GitHub Actions on PR event** | Workflow triggers on `pull_request` | Simple, no infra to maintain, runs in GitHub's compute | Limited to diff context, cold start per run |
| **GitHub App (webhook)** | Webhook → Lambda → review → post comments | Real-time, can maintain state, conversation support | More complex, needs hosting |
| **PR comment bot** | Post summary + inline comments via GitHub API | Native UX, developers already look at PR comments | Can be noisy |
| **Inline suggestions** | Use GitHub's "suggested changes" format | One-click apply, very low friction | Only works for simple changes |
| **Summary-only** | Single comment with review summary | Low noise, easy to scan | Loses line-specific context |

**Best approach for a small project: GitHub Actions + inline comments + summary.** No infra to maintain, triggers automatically, and the comments live right where developers look.

---

## 2. Recommended Approach for RunMapRepeat

### 2.1 Architecture

```
PR opened/updated
    │
    ▼
GitHub Actions workflow triggers
    │
    ▼
Custom review script (Python or Node)
    │
    ├── Fetch PR diff via GitHub API
    ├── Fetch relevant file context (changed files, full content)
    ├── Build structured prompt with project context
    ├── Call Amazon Bedrock (Claude Sonnet) via AWS SDK
    ├── Parse response into inline comments + summary
    │
    ▼
Post review via GitHub API
    ├── Inline comments on specific lines
    └── Summary comment with overall assessment
```

### 2.2 Why Custom Over Off-the-Shelf

1. **Bedrock integration**: RunMapRepeat already uses AWS. Using Bedrock means no external API keys, IAM-based auth, and cost stays within the AWS bill. None of the open-source actions support Bedrock natively.
2. **Project-specific prompts**: RunMapRepeat has specific conventions (CDK patterns, Lambda structure, React patterns) that benefit from tailored prompts.
3. **Simplicity**: A single Python script (~200-300 lines) in a GitHub Action is easier to maintain than a GitHub App with webhooks and state.
4. **Cost**: Claude Sonnet on Bedrock for a few PRs/week costs pennies. No SaaS subscription needed.

### 2.3 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM | Claude Sonnet 4 via Bedrock | Best reasoning for code review, already in AWS account, cost-effective |
| Trigger | GitHub Actions `pull_request` event | Zero infra, automatic |
| Auth to Bedrock | OIDC federation (GitHub → AWS IAM Role) | No long-lived secrets, industry best practice |
| Comment style | Inline comments + summary | Line-specific feedback + overview |
| Review scope | Changed files only, with full file context | Balance between context and token cost |
| Noise control | Severity levels (critical/warning/info), skip formatting-only feedback | Reduce false positive fatigue |
| File filtering | Skip `*.md`, `*.json` (non-logic), `node_modules/`, `cdk.out/` | Don't waste tokens on generated/config files |
| Re-review | On push to PR branch (changed files only) | Incremental, cost-efficient |

### 2.4 Prompt Structure

```
<system>
You are a senior developer reviewing a pull request for RunMapRepeat,
a personal exercise tracker app.

Tech stack:
- Frontend: React 18 + Vite + TypeScript
- Backend: AWS Lambda (Python 3.12)
- Infrastructure: AWS CDK (Python)
- CI/CD: AWS CodeBuild + CodePipeline

Project conventions:
- Lambda handlers must handle errors and return proper HTTP responses
- DynamoDB scans must paginate (1MB limit per call)
- CDK constructs follow Well-Architected patterns
- React components use functional style with hooks
- No hardcoded AWS account IDs, ARNs, or secrets in source

Review rules:
- Focus on bugs, security issues, and logic errors
- Flag missing error handling and edge cases
- Check for AWS anti-patterns (public buckets, overly permissive IAM)
- DO NOT comment on code formatting, import order, or naming preferences
- DO NOT suggest adding comments to self-explanatory code
- Assign severity: CRITICAL (must fix), WARNING (should fix), INFO (consider)
</system>

<user>
Review this pull request.

PR Title: {{pr_title}}
PR Description: {{pr_description}}

Files changed:

{{for each file}}
### {{filename}}
```diff
{{diff}}
```

Full file content:
```{{language}}
{{file_content}}
```
{{end for}}

Respond in this format:

## Summary
Brief overview of the changes and overall assessment.

## Issues Found

### [SEVERITY] filename:line - Short description
Explanation of the issue and suggested fix.
```suggestion
// suggested code change
```
</user>
```

### 2.5 File: `.github/workflows/ai-review.yml`

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  id-token: write  # For OIDC federation

jobs:
  review:
    runs-on: ubuntu-latest
    # Don't review Dependabot or bot PRs
    if: github.actor != 'dependabot[bot]'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-ai-review
          aws-region: us-east-1

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install boto3 PyGithub

      - name: Run AI review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_NAME: ${{ github.repository }}
        run: python .github/scripts/ai_review.py
```

---

## 3. Loki-Driven Review Flow (Current Workflow)

Before implementing the automated GitHub Actions bot, the project already uses a proven manual-trigger flow through Loki (AI assistant). This workflow was validated on PRs #64 and #65 (Spotify integration) and should be documented as the **primary review path** until the automated bot is built.

### 3.1 Flow Diagram

```
Developer opens PR(s)
    │
    ▼
Developer asks Loki: "Review the open PRs"
    │
    ▼
Loki spawns parallel sub-agents (one per PR)
    │
    ├── Sub-agent 1: Clone repo → checkout PR → full code review
    │     └── Structured output: Summary, Findings (severity), Verdict
    │
    ├── Sub-agent 2: Clone repo → checkout PR → full code review
    │     └── Structured output: Summary, Findings (severity), Verdict
    │
    ▼
Loki receives results, posts inline comments on each PR
    │
    ├── PR #N: Review comment (COMMENT event) with:
    │     ├── Body: summary + highlight + finding counts
    │     └── Inline comments: one per finding, with severity + fix suggestion
    │
    ▼
Developer reviews comments, asks Loki to fix
    │
    ▼
Loki spawns coding agents (one per PR, parallel)
    │
    ├── Agent 1: Checkout branch → implement fixes → run tests → commit + push
    ├── Agent 2: Checkout branch → implement fixes → run tests → commit + push
    │
    ▼
Developer reviews updated PRs → merge
```

### 3.2 Review Prompt Structure

Each sub-agent receives a structured review task covering:

| Category | What to check |
|----------|---------------|
| **Security** | Credential handling, input validation, CORS, XSS, open redirects, IAM permissions |
| **Error handling** | Missing try/catch, unhandled edge cases, error propagation |
| **Code quality** | Typing, naming, DRY, structure, dead code |
| **AWS best practices** | Lambda patterns, cold start, IAM scope, CDK constructs |
| **Test coverage** | Missing test cases, edge cases, test quality |
| **Performance** | Unnecessary re-renders, bundle size, network calls, memory |
| **Compliance** | Third-party ToS (e.g., Spotify branding), accessibility |

### 3.3 Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 🔴 CRITICAL | Security vulnerability or data loss risk | Must fix before merge |
| 🟠 HIGH | Bug, missing error handling, or security hardening gap | Must fix before merge |
| 🟡 MEDIUM | Code quality, minor bugs, missing validation, UX issues | Should fix (can be follow-up) |
| 🟢 LOW | Style, minor improvements, optional optimizations | Nice to have |
| 📝 NIT | Trivial observations, naming, formatting | Ignore or fix opportunistically |

### 3.4 Comment Format (GitHub PR Review)

Each inline comment follows this format:

```
🟠 **HIGH: Short description**

Explanation of the issue with context.

**Fix:**
\`\`\`python
# Suggested code change
\`\`\`
```

The review body includes:
- **Highlights** (what's done well)
- **Finding counts** by severity
- "See inline comments for details"

### 3.5 Fix Flow

Coding agents receive the full list of review findings organized by priority. They:

1. Checkout the PR branch in an isolated worktree
2. Implement all HIGH and MEDIUM fixes
3. Run the existing test suite to verify no regressions
4. Fix any test failures caused by the changes
5. Commit with a descriptive message (e.g., `fix: address PR #64 code review findings`)
6. Push to the PR branch

### 3.6 Limitations of Manual Flow

| Limitation | Mitigation |
|------------|------------|
| Requires Loki to be prompted | Automated flow (Phase 1 below) removes this |
| Review posted as repo owner (can't "Request Changes" on own PR) | Posts as COMMENT instead — same visibility |
| No incremental re-review on push | Re-run manually after fixes |
| No automatic trigger on PR open | Developer asks when ready |

---

## 4. Automated GitHub Actions Bot (Implementation Plan)

### Phase 1: MVP (1-2 hours)
- [ ] Create IAM role for GitHub OIDC federation with Bedrock invoke permissions
- [ ] Write `ai_review.py` script (~200 lines):
  - Fetch PR diff and changed files via PyGithub
  - Build prompt from template (using severity levels and categories from §3.2-3.3)
  - Call Bedrock Claude Sonnet
  - Parse response and post as PR review comments (using format from §3.4)
- [ ] Add workflow file `.github/workflows/ai-review.yml`
- [ ] Test on a real PR

### Phase 2: Refinement (1-2 hours)
- [ ] Add file filtering (skip `.md`, `cdk.out/`, etc.)
- [ ] Add prompt template as a separate file (`.github/prompts/review.md`) for easy editing
- [ ] Handle large PRs: chunk files if total tokens exceed context window
- [ ] Add cost tracking (log token usage)

### Phase 3: Polish (optional, 1 hour)
- [ ] Add `/review` slash command in PR comments to trigger manual re-review
- [ ] Add severity filtering (only post CRITICAL and WARNING by default)
- [ ] Track review quality: add thumbs up/down reactions and log to CloudWatch
- [ ] Add `.github/review-rules.yml` for configurable ignore patterns and custom rules

---

## 5. Cost Estimate

For a personal project with ~5-10 PRs/week, averaging 500 lines changed per PR:

| Component | Estimate |
|-----------|----------|
| Bedrock Claude Sonnet input tokens | ~5K tokens/PR × 10 PRs = 50K tokens/week |
| Bedrock Claude Sonnet output tokens | ~2K tokens/PR × 10 PRs = 20K tokens/week |
| Monthly cost | **< $1/month** |
| GitHub Actions minutes | Free tier (2,000 min/month for private repos) |

This is effectively free for a personal project.

---

## 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **False positives / noise** | High | Medium | Strict prompt rules (no formatting nits), severity filtering, start conservative and tune |
| **Hallucinated suggestions** | Medium | Medium | Always include full file context (not just diff), human reviewer has final say |
| **Context window overflow** | Low | Low | File chunking for large PRs, skip non-code files |
| **Bedrock rate limits** | Low | Low | Single PR at a time, exponential backoff |
| **Cost runaway** | Very Low | Low | Hard token limit in script, budget alert on AWS account |
| **Over-reliance on AI review** | Low | High | Bot posts "Comment" reviews only, never "Approve" — human approval still required |
| **Prompt injection via PR content** | Low | Medium | Sanitize PR description, don't execute suggested code, review-only permissions |
| **Stale prompts** | Medium | Low | Keep prompt template in repo, update as conventions evolve |

---

## 7. Alternatives Considered

### Option A: GitHub Copilot Code Review (Built-in)
- **Pros**: Zero setup, native UX
- **Cons**: Requires Copilot subscription, limited customization (4K char instruction limit), can't use Bedrock, repeats dismissed comments
- **Verdict**: Good fallback if custom approach is too much effort, but less tailored

### Option B: CodeRabbit SaaS (Free for OSS)
- **Pros**: Best-in-class review quality, learns from feedback, zero maintenance
- **Cons**: External SaaS, data leaves repo, RunMapRepeat is a private repo (would need paid plan)
- **Verdict**: Overkill for a personal project, and costs money for private repos

### Option C: Fork `ai-pr-reviewer` and add Bedrock support
- **Pros**: Battle-tested codebase, incremental review, conversation support
- **Cons**: Repo is in maintenance mode, significant codebase to understand and modify
- **Verdict**: More effort than writing a simple custom script

### **Selected: Option D — Custom lightweight script with Bedrock**
Best fit for a small personal project: minimal code, full control, no external dependencies, uses existing AWS infrastructure.

---

## 8. Future Enhancements (Not in Scope)

- **Codebase indexing**: Embed the full codebase in a vector store for richer context (only worthwhile if the project grows significantly)
- **Learning from feedback**: Track which comments get thumbs up/down and tune prompts
- **Multi-model review**: Use a fast model for triage and a powerful model for flagged files
- **Integration with Loki**: Have the review bot notify via Telegram when critical issues are found
- **Pre-commit review**: Review code before it's pushed (IDE integration)

---

## Appendix: Key References

1. Greptile — "What Developers Need to Know About AI Code Reviews" — [greptile.com/blog/ai-code-review](https://www.greptile.com/blog/ai-code-review)
2. GitHub Copilot Code Review docs — [docs.github.com](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review)
3. CodeRabbit ai-pr-reviewer (open source) — [github.com/coderabbitai/ai-pr-reviewer](https://github.com/coderabbitai/ai-pr-reviewer)
4. ChatGPT-CodeReview — [github.com/anc95/ChatGPT-CodeReview](https://github.com/anc95/ChatGPT-CodeReview)
5. CodeRabbit platform docs — [docs.coderabbit.ai](https://docs.coderabbit.ai)
6. Anthropic prompt engineering — [docs.anthropic.com](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
