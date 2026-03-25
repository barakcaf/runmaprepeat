"""AI Code Review Agent — reviews PRs via Amazon Bedrock (Claude Opus 4.6).

Runs inside GitHub Actions. Posts inline comments + summary on the PR.
On re-review (synchronize), reads existing comments and auto-resolves
threads that have been fixed by the new push. Posts "✅ Ready for Merge"
when no unresolved CRITICAL/HIGH issues remain.

Environment variables (set by workflow):
  GITHUB_TOKEN       — GitHub token with pull-requests:write
  PR_NUMBER          — PR number to review
  REPO_NAME          — owner/repo
  TELEGRAM_BOT_TOKEN — (optional) Telegram bot token
  TELEGRAM_CHAT_ID   — (optional) Telegram chat ID
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import urllib.request
import urllib.error
import uuid
from pathlib import Path

import boto3

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_FILES = 15
MAX_CHANGED_LINES = 1500
MODEL_ID = "us.anthropic.claude-opus-4-6-v1"
MAX_OUTPUT_TOKENS = 8192

SKIP_PATTERNS = (
    "cdk.out/", "node_modules/", "__pycache__/", "dist/", ".git/",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
    ".lock", ".map",
)

SEVERITY_EMOJI = {
    "CRITICAL": "🔴",
    "HIGH": "🟠",
    "MEDIUM": "🟡",
    "LOW": "🟢",
}

INLINE_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM"}

BOT_LOGIN = "github-actions[bot]"

# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

GITHUB_API = "https://api.github.com"


def gh_headers() -> dict[str, str]:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("GITHUB_TOKEN environment variable is required")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _safe_log_url(url: str) -> str:
    """Strip any query parameters that might contain tokens."""
    return url.split("?")[0] if "?" in url else url


def gh_get(path: str) -> dict | list:
    url = f"{GITHUB_API}{path}"
    req = urllib.request.Request(url, headers=gh_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else ""
        log.error("GitHub API GET %s failed: %s %s — %s", _safe_log_url(url), e.code, e.reason, body[:500])
        raise


def gh_get_all(path: str) -> list:
    """Paginated GET — follows Link: next headers."""
    results: list = []
    url = f"{GITHUB_API}{path}"
    while url:
        req = urllib.request.Request(url, headers=gh_headers())
        try:
            with urllib.request.urlopen(req) as resp:
                results.extend(json.loads(resp.read()))
                link = resp.headers.get("Link", "")
                url = None
                for part in link.split(","):
                    if 'rel="next"' in part:
                        match = re.search(r"<([^>]+)>", part)
                        if match:
                            url = match.group(1)
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, "read") else ""
            log.error("GitHub API GET %s failed: %s %s — %s", _safe_log_url(url or ""), e.code, e.reason, body[:500])
            raise
    return results


def gh_post(path: str, body: dict) -> dict:
    url = f"{GITHUB_API}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        **gh_headers(),
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if hasattr(e, "read") else ""
        log.error("GitHub API POST %s failed: %s %s — %s", _safe_log_url(url), e.code, e.reason, error_body[:500])
        raise


def gh_graphql(query: str, variables: dict | None = None) -> dict:
    """Execute a GitHub GraphQL query."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    url = "https://api.github.com/graphql"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={
        **gh_headers(),
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            if "errors" in result:
                log.warning("GraphQL errors: %s", result["errors"])
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else ""
        log.error("GraphQL request failed: %s %s — %s", e.code, e.reason, body[:500])
        raise


def get_file_content(repo: str, path: str, ref: str) -> str | None:
    """Fetch raw file content from GitHub."""
    try:
        url = f"{GITHUB_API}/repos/{repo}/contents/{path}?ref={ref}"
        req = urllib.request.Request(url, headers={
            **gh_headers(),
            "Accept": "application/vnd.github.raw+json",
        })
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError:
        return None


# ---------------------------------------------------------------------------
# Existing comment helpers
# ---------------------------------------------------------------------------

def fetch_review_threads(repo: str, pr_number: int) -> list[dict]:
    """Fetch review threads with their resolved status using GraphQL.

    Returns list of {thread_id, is_resolved, comments: [{id, node_id, body, path, line}]}
    """
    owner, name = repo.split("/")
    query = """
    query($owner: String!, $name: String!, $pr: Int!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $pr) {
          reviewThreads(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              isResolved
              comments(first: 20) {
                nodes {
                  id
                  databaseId
                  body
                  path
                  line
                  author { login }
                }
              }
            }
          }
        }
      }
    }
    """
    threads = []
    cursor = None
    while True:
        result = gh_graphql(query, {"owner": owner, "name": name, "pr": pr_number, "cursor": cursor})
        data = result.get("data", {})
        pr_data = data.get("repository", {}).get("pullRequest", {})
        thread_data = pr_data.get("reviewThreads", {})
        for node in thread_data.get("nodes", []):
            comments = node.get("comments", {}).get("nodes", [])
            # Only include threads started by the bot
            if comments and comments[0].get("author", {}).get("login") == BOT_LOGIN:
                threads.append({
                    "thread_id": node["id"],
                    "is_resolved": node["isResolved"],
                    "comments": [
                        {
                            "id": c["databaseId"],
                            "node_id": c["id"],
                            "body": c["body"],
                            "path": c.get("path", ""),
                            "line": c.get("line"),
                        }
                        for c in comments
                    ],
                })
        page_info = thread_data.get("pageInfo", {})
        if page_info.get("hasNextPage"):
            cursor = page_info["endCursor"]
        else:
            break
    return threads


def resolve_thread(thread_id: str) -> bool:
    """Resolve a review thread using GraphQL."""
    mutation = """
    mutation($threadId: ID!) {
      resolveReviewThread(input: {threadId: $threadId}) {
        thread { id isResolved }
      }
    }
    """
    try:
        result = gh_graphql(mutation, {"threadId": thread_id})
        resolved = (
            result.get("data", {})
            .get("resolveReviewThread", {})
            .get("thread", {})
            .get("isResolved", False)
        )
        return resolved
    except Exception as e:
        log.warning("Failed to resolve thread %s: %s", thread_id, e)
        return False


# ---------------------------------------------------------------------------
# Diff helpers
# ---------------------------------------------------------------------------

def count_changed_lines(files: list[dict]) -> int:
    return sum(f.get("additions", 0) + f.get("deletions", 0) for f in files)


def should_skip(filename: str) -> bool:
    return any(p in filename for p in SKIP_PATTERNS)


def parse_diff_line_map(patch: str) -> dict[int, int]:
    """Map file line numbers to diff positions for inline comments.

    GitHub's review comment API requires a `position` that is the line's
    1-based index within the unified diff hunk (the patch text), NOT the
    file line number. This function builds a mapping from file line numbers
    to diff positions so we can place comments correctly.
    """
    if not patch:
        return {}
    mapping: dict[int, int] = {}
    position = 0
    file_line = 0
    for raw_line in patch.split("\n"):
        position += 1
        if raw_line.startswith("@@"):
            hunk_match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", raw_line)
            if hunk_match:
                file_line = int(hunk_match.group(1)) - 1
            else:
                file_line = 0
            continue
        if raw_line.startswith("-"):
            continue
        file_line += 1
        mapping[file_line] = position
    return mapping


# ---------------------------------------------------------------------------
# Bedrock
# ---------------------------------------------------------------------------

_bedrock_client = None


def _get_bedrock_client():
    """Return a cached Bedrock runtime client."""
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
    return _bedrock_client


def call_bedrock(prompt: str) -> str:
    client = _get_bedrock_client()
    response = client.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={
            "maxTokens": MAX_OUTPUT_TOKENS,
            "temperature": 0.2,
        },
    )
    return response["output"]["message"]["content"][0]["text"]


def parse_json_response(raw: str) -> dict:
    """Parse JSON from model response, handling markdown code fences."""
    text = raw.strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Strip markdown code fences
    match = re.search(r"```(?:json)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Last resort: find first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise json.JSONDecodeError("Could not extract JSON from response", text, 0)


# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------

def send_telegram(message: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        log.info("Telegram not configured, skipping notification")
        return
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = json.dumps({
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }).encode()
        req = urllib.request.Request(url, data=data, headers={
            "Content-Type": "application/json",
        })
        urllib.request.urlopen(req)
    except Exception as e:
        log.warning("Telegram notification failed: %s", e)


# ---------------------------------------------------------------------------
# Comment resolution logic
# ---------------------------------------------------------------------------

def build_resolution_prompt(
    unresolved_threads: list[dict],
    file_contents: dict[str, str],
) -> str:
    """Build a prompt asking the LLM which prior comments have been fixed."""
    prompt = (
        "You are reviewing whether previous code review comments have been "
        "addressed by the current version of the code.\n\n"
        "For each comment below, check if the issue described has been fixed "
        "in the current code. Respond with JSON only:\n\n"
        "```json\n"
        '{"resolutions": [\n'
        '  {"thread_id": "<thread_id>", "resolved": true, "reason": "Brief explanation"},\n'
        '  ...\n'
        "]}\n"
        "```\n\n"
        "Rules:\n"
        "- resolved=true means the issue is FIXED in the current code\n"
        "- resolved=false means the issue STILL EXISTS\n"
        "- Be conservative: only mark resolved if you're confident the fix is correct\n\n"
        "---\n\n"
    )

    for thread in unresolved_threads:
        first_comment = thread["comments"][0]
        path = first_comment.get("path", "unknown")
        line = first_comment.get("line", "?")
        body = first_comment["body"][:500]

        prompt += f"### Thread: {thread['thread_id']}\n"
        prompt += f"**File:** `{path}` **Line:** {line}\n"
        prompt += f"**Comment:** {body}\n\n"

        # Include current file content if available
        if path in file_contents:
            prompt += f"**Current file content:**\n```\n{file_contents[path]}\n```\n\n"
        else:
            prompt += "*(File not found in current version)*\n\n"

    return prompt


def resolve_fixed_comments(
    repo: str,
    pr_number: int,
    head_sha: str,
) -> tuple[int, int]:
    """Check unresolved bot threads and resolve those that are fixed.

    Returns (resolved_count, still_open_count).
    """
    threads = fetch_review_threads(repo, pr_number)
    unresolved = [t for t in threads if not t["is_resolved"]]

    if not unresolved:
        log.info("No unresolved bot review threads found")
        return 0, 0

    log.info("Found %d unresolved bot review threads", len(unresolved))

    # Fetch current file contents for files referenced in comments
    referenced_files: set[str] = set()
    for thread in unresolved:
        for comment in thread["comments"]:
            if comment.get("path"):
                referenced_files.add(comment["path"])

    file_contents: dict[str, str] = {}
    for filepath in referenced_files:
        content = get_file_content(repo, filepath, head_sha)
        if content:
            file_contents[filepath] = content

    # Ask LLM which comments are fixed
    prompt = build_resolution_prompt(unresolved, file_contents)
    log.info("Asking Bedrock to check %d unresolved comments...", len(unresolved))
    raw = call_bedrock(prompt)

    try:
        result = parse_json_response(raw)
    except json.JSONDecodeError:
        log.warning("Could not parse resolution response, skipping auto-resolve")
        return 0, len(unresolved)

    resolutions = result.get("resolutions", [])
    resolved_count = 0

    # Build set of known thread IDs for validation
    known_thread_ids = {t["thread_id"] for t in unresolved}

    for res in resolutions:
        if res.get("resolved"):
            thread_id = res.get("thread_id", "")
            if thread_id not in known_thread_ids:
                log.warning("LLM returned unknown thread_id %s, skipping", thread_id)
                continue
            reason = res.get("reason", "Fixed by new changes")
            if resolve_thread(thread_id):
                log.info("Resolved thread %s: %s", thread_id, reason)
                resolved_count += 1
            else:
                log.warning("Failed to resolve thread %s", thread_id)

    still_open = len(unresolved) - resolved_count
    log.info("Resolved %d threads, %d still open", resolved_count, still_open)
    return resolved_count, still_open


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # Validate required environment variables
    repo = os.environ.get("REPO_NAME")
    pr_number_str = os.environ.get("PR_NUMBER")

    if not repo or not pr_number_str:
        log.error("Missing required environment variables: REPO_NAME, PR_NUMBER")
        sys.exit(1)

    try:
        pr_number = int(pr_number_str)
    except ValueError:
        log.error("PR_NUMBER must be a valid integer, got: %s", pr_number_str)
        sys.exit(1)

    log.info("Reviewing PR #%d in %s", pr_number, repo)

    # 1. Fetch PR metadata
    pr = gh_get(f"/repos/{repo}/pulls/{pr_number}")
    pr_title = pr["title"]
    pr_body = (pr.get("body") or "")[:500]
    pr_author = pr["user"]["login"]
    head_sha = pr["head"]["sha"]

    # 2. Resolve previously-flagged comments that are now fixed
    resolved_count, still_open_count = resolve_fixed_comments(repo, pr_number, head_sha)

    # 3. Fetch changed files
    files = gh_get_all(f"/repos/{repo}/pulls/{pr_number}/files")
    log.info("PR has %d changed files", len(files))

    # 4. Filter
    code_files = [f for f in files if not should_skip(f["filename"])]
    changed_lines = count_changed_lines(code_files)
    log.info("After filtering: %d files, %d changed lines", len(code_files), changed_lines)

    # 5. Bail on large PRs
    if len(code_files) > MAX_FILES or changed_lines > MAX_CHANGED_LINES:
        bail_body = (
            f"## 🤖 AI Code Review\n\n"
            f"This PR is too large for automated review "
            f"({len(code_files)} files, {changed_lines} changed lines).\n\n"
            f"**Limits:** {MAX_FILES} files / {MAX_CHANGED_LINES} lines.\n\n"
            f"Consider splitting into smaller, focused PRs for better review coverage."
        )
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", {
            "body": bail_body,
            "event": "COMMENT",
        })
        send_telegram(
            f"🤖 AI Review skipped PR #{pr_number} — too large "
            f"({len(code_files)} files, {changed_lines} lines)\n"
            f"<a href=\"{pr['html_url']}\">{pr_title}</a>"
        )
        log.info("PR too large, posted bail message")
        return

    if not code_files:
        log.info("No reviewable code files, skipping")
        return

    # 6. Build prompt
    prompt_template = Path(__file__).parent.parent.joinpath(
        "prompts", "review.md"
    ).read_text()

    file_context = []
    diff_maps: dict[str, dict[int, int]] = {}

    for f in code_files:
        filename = f["filename"]
        patch = f.get("patch", "")
        full_content = get_file_content(repo, filename, head_sha) or "(file not found)"

        diff_maps[filename] = parse_diff_line_map(patch)

        file_context.append(
            f"### {filename}\n\n"
            f"**Diff:**\n```diff\n{patch}\n```\n\n"
            f"**Full file:**\n```\n{full_content}\n```\n"
        )

    prompt = (
        f"{prompt_template}\n\n"
        f"---\n\n"
        f"## PR Under Review\n\n"
        f"**Title:** {pr_title}\n"
        f"**Author:** {pr_author}\n"
        f"**Description:** {pr_body}\n\n"
        f"---\n\n"
        f"## Changed Files\n\n"
        + "\n".join(file_context)
    )

    # 7. Call Bedrock for review
    log.info("Calling Bedrock (%s) for code review...", MODEL_ID)
    raw_response = call_bedrock(prompt)

    try:
        review = parse_json_response(raw_response)
    except json.JSONDecodeError as e:
        log.error("Failed to parse Bedrock response as JSON: %s", e)
        log.error("Raw response:\n%s", raw_response[:2000])
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", {
            "body": "## 🤖 AI Code Review\n\n⚠️ Review failed — could not parse model response. Check workflow logs.",
            "event": "COMMENT",
        })
        sys.exit(1)

    # 8. Process findings
    findings = review.get("findings", [])
    summary_text = review.get("summary", "No summary provided.")
    highlights = review.get("highlights", [])
    pr_type = review.get("pr_type", "unknown")

    log.info("Review complete: %s, %d findings", pr_type, len(findings))

    severity_counts: dict[str, int] = {}
    for f in findings:
        sev = f.get("severity", "LOW")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Build inline comments (CRITICAL/HIGH/MEDIUM only)
    inline_comments = []
    low_findings = []

    for finding in findings:
        severity = finding.get("severity", "LOW")
        emoji = SEVERITY_EMOJI.get(severity, "📝")
        title = finding.get("title", "Issue found")
        body = finding.get("body", "")
        suggestion = finding.get("suggestion", "")
        filename = finding.get("file", "")
        line = finding.get("line", 0)

        comment_body = f"{emoji} **{severity}: {title}**\n\n{body}"
        if suggestion:
            comment_body += f"\n\n**Fix:**\n```suggestion\n{suggestion}\n```"

        if severity in INLINE_SEVERITIES and filename and line:
            diff_map = diff_maps.get(filename, {})
            position = diff_map.get(line)

            if position:
                inline_comments.append({
                    "path": filename,
                    "position": position,
                    "body": comment_body,
                })
            else:
                low_findings.append(
                    f"- {emoji} **{title}** — `{filename}:{line}` — {body}"
                )
        else:
            low_findings.append(
                f"- {emoji} **{title}** — `{filename}:{line}` — {body}"
            )

    # 9. Build review body
    review_body = f"## 🤖 AI Code Review — #{pr_number}: {pr_title}\n\n"
    review_body += f"*Type: {pr_type}*\n\n"
    review_body += f"{summary_text}\n\n"

    if highlights:
        review_body += "### 🟢 Highlights\n"
        for h in highlights:
            review_body += f"- {h}\n"
        review_body += "\n"

    # Resolution summary (if any comments were processed)
    if resolved_count > 0 or still_open_count > 0:
        review_body += "### 🔄 Previous Comments\n"
        if resolved_count > 0:
            review_body += f"- ✅ **{resolved_count}** comment(s) auto-resolved (fixed by this push)\n"
        if still_open_count > 0:
            review_body += f"- ⏳ **{still_open_count}** comment(s) still unresolved\n"
        review_body += "\n"

    # New findings summary
    if findings:
        counts_str = ", ".join(
            f"{count} {SEVERITY_EMOJI.get(sev, '')} {sev}"
            for sev, count in sorted(
                severity_counts.items(),
                key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
                if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99,
            )
        )
        review_body += f"### Findings: {counts_str}\n"
        review_body += "See inline comments for details.\n\n"
    else:
        review_body += "### ✅ No new issues found\n\n"

    if low_findings:
        review_body += "### Low Priority / Out-of-Diff\n"
        for lf in low_findings:
            review_body += f"{lf}\n"
        review_body += "\n"

    # 10. Determine if ready for merge
    has_blockers = (
        severity_counts.get("CRITICAL", 0) > 0
        or severity_counts.get("HIGH", 0) > 0
        or still_open_count > 0
    )

    # 10a. Write GitHub Actions outputs for downstream jobs (e.g., fix agent)
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        findings_summary = "\n".join(
            f"- [{f.get('severity', 'LOW')}] {f.get('file', '?')}:{f.get('line', '?')} — "
            f"{f.get('title', '')}: {f.get('body', '')[:200]}"
            for f in findings
        )
        with open(gh_output, "a") as fh:
            fh.write(f"has_findings={'true' if has_blockers else 'false'}\n")
            # Multi-line outputs use delimiter syntax — unique per output
            delim1 = f"ghadelim_{uuid.uuid4().hex[:8]}"
            delim2 = f"ghadelim_{uuid.uuid4().hex[:8]}"
            fh.write(f"findings_json<<{delim1}\n{json.dumps(findings)}\n{delim1}\n")
            fh.write(f"findings_summary<<{delim2}\n{findings_summary}\n{delim2}\n")
        log.info("Wrote GitHub Actions outputs: has_findings=%s", has_blockers)

    if not has_blockers:
        review_body += "---\n\n## ✅ Ready for Merge\n\n"
        review_body += "No unresolved CRITICAL/HIGH findings. This PR is ready for human approval.\n"

    # 11. Post review
    review_payload: dict = {
        "body": review_body,
        "event": "COMMENT",
    }
    if inline_comments:
        review_payload["comments"] = inline_comments

    try:
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", review_payload)
        log.info("Posted review with %d inline comments", len(inline_comments))
    except urllib.error.HTTPError:
        # Retry without inline comments (position mapping can fail)
        if inline_comments:
            log.info("Retrying without inline comments...")
            review_payload.pop("comments", None)
            review_body += "\n\n*⚠️ Inline comments could not be placed — findings listed above.*\n"
            for c in inline_comments:
                review_body += f"\n- **{c['path']}** — {c['body'][:200]}...\n"
            review_payload["body"] = review_body
            gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", review_payload)
            log.info("Posted review as summary-only (fallback)")

    # 12. Telegram notification
    tg_resolved = f" | 🔄 {resolved_count} resolved" if resolved_count > 0 else ""
    if findings:
        tg_counts = " ".join(
            f"{SEVERITY_EMOJI.get(sev, '')} {count} {sev}"
            for sev, count in sorted(
                severity_counts.items(),
                key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
                if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99,
            )
        )
        tg_msg = (
            f"🔍 <b>AI Review</b> — PR #{pr_number}\n"
            f"{tg_counts}{tg_resolved}\n"
            f"<a href=\"{pr['html_url']}\">{pr_title}</a>"
        )
    else:
        ready_tag = " — ✅ Ready for Merge" if not has_blockers else ""
        tg_msg = (
            f"✅ <b>AI Review</b> — PR #{pr_number}{ready_tag}\n"
            f"No new issues{tg_resolved}\n"
            f"<a href=\"{pr['html_url']}\">{pr_title}</a>"
        )
    send_telegram(tg_msg)

    log.info("Done! Ready for merge: %s", not has_blockers)


if __name__ == "__main__":
    main()
