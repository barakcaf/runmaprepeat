"""AI Code Review Agent — reviews PRs via Amazon Bedrock (Claude Sonnet).

Runs inside GitHub Actions. Posts inline comments + summary on the PR.
Sends Telegram notification with severity summary.

Environment variables (set by workflow):
  GITHUB_TOKEN    — GitHub token with pull-requests:write
  PR_NUMBER       — PR number to review
  REPO_NAME       — owner/repo
  TELEGRAM_BOT_TOKEN — (optional) Telegram bot token
  TELEGRAM_CHAT_ID   — (optional) Telegram chat ID
"""

from __future__ import annotations

import json
import logging
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

import boto3

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_FILES = 15
MAX_CHANGED_LINES = 1500
MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MAX_INPUT_TOKENS = 8000
MAX_OUTPUT_TOKENS = 4096

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

# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

GITHUB_API = "https://api.github.com"


def gh_headers() -> dict[str, str]:
    token = os.environ["GITHUB_TOKEN"]
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def gh_get(path: str) -> dict | list:
    url = f"{GITHUB_API}{path}"
    req = urllib.request.Request(url, headers=gh_headers())
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def gh_get_all(path: str) -> list:
    """Paginated GET — follows Link: next headers."""
    results = []
    url = f"{GITHUB_API}{path}"
    while url:
        req = urllib.request.Request(url, headers=gh_headers())
        with urllib.request.urlopen(req) as resp:
            results.extend(json.loads(resp.read()))
            link = resp.headers.get("Link", "")
            url = None
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]
    return results


def gh_post(path: str, body: dict) -> dict:
    url = f"{GITHUB_API}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        **gh_headers(),
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


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
            # Parse hunk header: @@ -old,count +new,count @@
            try:
                plus_part = raw_line.split("+")[1].split("@@")[0]
                file_line = int(plus_part.split(",")[0]) - 1
            except (IndexError, ValueError):
                file_line = 0
            continue
        if raw_line.startswith("-"):
            # Deleted line — no file line number
            continue
        file_line += 1
        mapping[file_line] = position
    return mapping


# ---------------------------------------------------------------------------
# Bedrock
# ---------------------------------------------------------------------------

def call_bedrock(prompt: str) -> str:
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    response = client.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={
            "maxTokens": MAX_OUTPUT_TOKENS,
            "temperature": 0.2,
        },
    )
    return response["output"]["message"]["content"][0]["text"]


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
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    repo = os.environ["REPO_NAME"]
    pr_number = int(os.environ["PR_NUMBER"])

    log.info("Reviewing PR #%d in %s", pr_number, repo)

    # 1. Fetch PR metadata
    pr = gh_get(f"/repos/{repo}/pulls/{pr_number}")
    pr_title = pr["title"]
    pr_body = (pr.get("body") or "")[:500]
    pr_author = pr["user"]["login"]
    head_sha = pr["head"]["sha"]

    # 2. Fetch changed files
    files = gh_get_all(f"/repos/{repo}/pulls/{pr_number}/files")
    log.info("PR has %d changed files", len(files))

    # 3. Filter
    code_files = [f for f in files if not should_skip(f["filename"])]
    changed_lines = count_changed_lines(code_files)
    log.info("After filtering: %d files, %d changed lines", len(code_files), changed_lines)

    # 4. Bail on large PRs
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

    # 5. Build prompt
    prompt_template = Path(__file__).parent.parent.joinpath(
        "prompts", "review.md"
    ).read_text()

    file_context = []
    diff_maps: dict[str, dict[int, int]] = {}

    for f in code_files:
        filename = f["filename"]
        patch = f.get("patch", "")
        full_content = get_file_content(repo, filename, head_sha) or "(file not found)"

        # Build diff position map for inline comments
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

    # 6. Call Bedrock
    log.info("Calling Bedrock (%s)...", MODEL_ID)
    raw_response = call_bedrock(prompt)

    # Parse JSON — handle markdown wrapping
    json_str = raw_response.strip()
    if json_str.startswith("```"):
        json_str = "\n".join(json_str.split("\n")[1:])
        if json_str.endswith("```"):
            json_str = json_str[:-3]
    json_str = json_str.strip()

    try:
        review = json.loads(json_str)
    except json.JSONDecodeError as e:
        log.error("Failed to parse Bedrock response as JSON: %s", e)
        log.error("Raw response:\n%s", raw_response[:2000])
        # Post error comment
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", {
            "body": "## 🤖 AI Code Review\n\n⚠️ Review failed — could not parse model response. Check workflow logs.",
            "event": "COMMENT",
        })
        sys.exit(1)

    # 7. Build review comments
    findings = review.get("findings", [])
    summary_text = review.get("summary", "No summary provided.")
    highlights = review.get("highlights", [])
    pr_type = review.get("pr_type", "unknown")

    log.info("Review complete: %s, %d findings", pr_type, len(findings))

    # Count by severity
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
            # Look up diff position
            diff_map = diff_maps.get(filename, {})
            position = diff_map.get(line)

            if position:
                inline_comments.append({
                    "path": filename,
                    "position": position,
                    "body": comment_body,
                })
            else:
                # Line not in diff — add as general comment in summary
                low_findings.append(
                    f"- {emoji} **{title}** — `{filename}:{line}` — {body}"
                )
        else:
            low_findings.append(
                f"- {emoji} **{title}** — `{filename}:{line}` — {body}"
            )

    # 8. Build review body
    review_body = f"## 🤖 AI Code Review — #{pr_number}: {pr_title}\n\n"
    review_body += f"*Type: {pr_type}*\n\n"
    review_body += f"{summary_text}\n\n"

    if highlights:
        review_body += "### 🟢 Highlights\n"
        for h in highlights:
            review_body += f"- {h}\n"
        review_body += "\n"

    # Findings summary
    if findings:
        counts_str = ", ".join(
            f"{count} {SEVERITY_EMOJI.get(sev, '')} {sev}"
            for sev, count in sorted(severity_counts.items(),
                                     key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
                                     if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99)
        )
        review_body += f"### Findings: {counts_str}\n"
        review_body += "See inline comments for details.\n\n"
    else:
        review_body += "### ✅ No issues found\n"
        review_body += "Code looks good!\n\n"

    if low_findings:
        review_body += "### Low Priority / Out-of-Diff\n"
        for lf in low_findings:
            review_body += f"{lf}\n"
        review_body += "\n"

    # 9. Post review
    review_payload: dict = {
        "body": review_body,
        "event": "COMMENT",
    }
    if inline_comments:
        review_payload["comments"] = inline_comments

    try:
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", review_payload)
        log.info("Posted review with %d inline comments", len(inline_comments))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if hasattr(e, "read") else str(e)
        log.error("Failed to post review: %s %s", e.code, error_body)
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

    # 10. Telegram notification
    if findings:
        tg_counts = " ".join(
            f"{SEVERITY_EMOJI.get(sev, '')} {count} {sev}"
            for sev, count in sorted(severity_counts.items(),
                                     key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
                                     if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99)
        )
        tg_msg = (
            f"🔍 <b>AI Review</b> — PR #{pr_number}\n"
            f"{tg_counts}\n"
            f"<a href=\"{pr['html_url']}\">{pr_title}</a>"
        )
    else:
        tg_msg = (
            f"✅ <b>AI Review</b> — PR #{pr_number}\n"
            f"No issues found\n"
            f"<a href=\"{pr['html_url']}\">{pr_title}</a>"
        )
    send_telegram(tg_msg)

    log.info("Done!")


if __name__ == "__main__":
    main()
# re-trigger
