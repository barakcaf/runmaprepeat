"""AI Code Review Agent — reviews PRs via Amazon Bedrock.

Repo-agnostic: reads review prompt from .github/prompts/review.md,
config from environment variables. Posts inline comments + summary.
On re-review (synchronize), auto-resolves fixed comment threads.

Environment variables (set by workflow):
  GITHUB_TOKEN       — GitHub token with pull-requests:write
  PR_NUMBER          — PR number to review
  REPO_NAME          — owner/repo
  MODEL_ID           — Bedrock model ID (default: us.anthropic.claude-opus-4-6-v1)
  MAX_FILES          — Max files to review (default: 15)
  MAX_CHANGED_LINES  — Max changed lines (default: 1500)
  MAX_OUTPUT_TOKENS  — Max output tokens (default: 16384)
  AWS_REGION         — AWS region (default: us-east-1)

  Notifications (all optional — omit to disable):
  NOTIFY_CHANNEL     — Channel type: telegram | slack | whatsapp | none (default: none)
  TELEGRAM_BOT_TOKEN — Telegram bot token (when NOTIFY_CHANNEL=telegram)
  TELEGRAM_CHAT_ID   — Telegram chat ID (when NOTIFY_CHANNEL=telegram)
  SLACK_WEBHOOK_URL  — Slack incoming webhook URL (when NOTIFY_CHANNEL=slack)
  WHATSAPP_API_URL   — WhatsApp Business API base URL (when NOTIFY_CHANNEL=whatsapp)
  WHATSAPP_TOKEN     — WhatsApp API bearer token (when NOTIFY_CHANNEL=whatsapp)
  WHATSAPP_PHONE_ID  — WhatsApp phone number ID (when NOTIFY_CHANNEL=whatsapp)
  WHATSAPP_TO        — Recipient phone number in E.164 format (when NOTIFY_CHANNEL=whatsapp)
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
import urllib.request
import urllib.error
import uuid
from pathlib import Path

import boto3

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config (from environment)
# ---------------------------------------------------------------------------

MAX_FILES = int(os.environ.get("MAX_FILES", "15"))
MAX_CHANGED_LINES = int(os.environ.get("MAX_CHANGED_LINES", "1500"))
MODEL_ID = os.environ.get("MODEL_ID", "us.anthropic.claude-opus-4-6-v1")
MAX_OUTPUT_TOKENS = int(os.environ.get("MAX_OUTPUT_TOKENS", "16384"))

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

HTTP_TIMEOUT = 30  # seconds for all HTTP calls


def _safe_log_url(url: str) -> str:
    """Strip query parameters that might contain tokens."""
    return url.split("?")[0] if "?" in url else url

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


def gh_get(path: str) -> dict | list:
    url = f"{GITHUB_API}{path}"
    req = urllib.request.Request(url, headers=gh_headers())
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else ""
        log.error("GET %s: %s %s — %s", path, e.code, e.reason, body[:500])
        raise


def gh_get_all(path: str) -> list:
    results: list = []
    url = f"{GITHUB_API}{path}"
    while url:
        req = urllib.request.Request(url, headers=gh_headers())
        try:
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
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
            log.error("GET %s: %s %s — %s", _safe_log_url(url or ""), e.code, e.reason, body[:500])
            raise
    return results


def gh_post(path: str, body: dict) -> dict:
    url = f"{GITHUB_API}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        **gh_headers(), "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if hasattr(e, "read") else ""
        log.error("POST %s: %s %s — %s", path, e.code, e.reason, error_body[:500])
        raise


def gh_graphql(query: str, variables: dict | None = None) -> dict:
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.github.com/graphql", data=data,
        headers={**gh_headers(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            result = json.loads(resp.read())
            if "errors" in result:
                log.warning("GraphQL errors: %s", result["errors"])
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else ""
        log.error("GraphQL: %s %s — %s", e.code, e.reason, body[:500])
        raise


def get_file_content(repo: str, path: str, ref: str) -> str | None:
    try:
        url = f"{GITHUB_API}/repos/{repo}/contents/{path}?ref={ref}"
        req = urllib.request.Request(url, headers={
            **gh_headers(), "Accept": "application/vnd.github.raw+json",
        })
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError:
        return None


# ---------------------------------------------------------------------------
# Review thread helpers (GraphQL)
# ---------------------------------------------------------------------------

def fetch_review_threads(repo: str, pr_number: int) -> list[dict]:
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
                nodes { id databaseId body path line author { login } }
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
        thread_data = result.get("data", {}).get("repository", {}).get("pullRequest", {}).get("reviewThreads", {})
        for node in thread_data.get("nodes", []):
            comments = node.get("comments", {}).get("nodes", [])
            if comments and comments[0].get("author", {}).get("login") == BOT_LOGIN:
                threads.append({
                    "thread_id": node["id"],
                    "is_resolved": node["isResolved"],
                    "comments": [
                        {"id": c["databaseId"], "node_id": c["id"], "body": c["body"],
                         "path": c.get("path", ""), "line": c.get("line")}
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
    mutation = """
    mutation($threadId: ID!) {
      resolveReviewThread(input: {threadId: $threadId}) {
        thread { id isResolved }
      }
    }
    """
    try:
        result = gh_graphql(mutation, {"threadId": thread_id})
        return result.get("data", {}).get("resolveReviewThread", {}).get("thread", {}).get("isResolved", False)
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
    if not patch:
        return {}
    mapping: dict[int, int] = {}
    position = 0
    file_line = 0
    for raw_line in patch.split("\n"):
        position += 1
        if raw_line.startswith("@@"):
            match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", raw_line)
            file_line = int(match.group(1)) - 1 if match else 0
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
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
    return _bedrock_client


def call_bedrock(prompt: str, retries: int = 3) -> str:
    """Call Bedrock with exponential backoff on transient errors."""
    client = _get_bedrock_client()
    for attempt in range(retries + 1):
        try:
            response = client.converse(
                modelId=MODEL_ID,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"maxTokens": MAX_OUTPUT_TOKENS, "temperature": 0.2},
            )
            return response["output"]["message"]["content"][0]["text"]
        except Exception as e:
            error_code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
            error_str = str(e).lower()
            is_transient = (
                error_code in ("ThrottlingException", "TooManyRequestsException",
                               "ServiceUnavailableException", "ModelTimeoutException")
                or "throttl" in error_str
                or "429" in error_str
            )
            if attempt < retries and is_transient:
                delay = 2 ** (attempt + 1)
                log.warning("Bedrock %s (attempt %d/%d), retrying in %ds...", error_code, attempt + 1, retries, delay)
                time.sleep(delay)
            else:
                raise


def parse_json_response(raw: str) -> dict:
    text = raw.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise json.JSONDecodeError("Could not extract JSON", text, 0)


# ---------------------------------------------------------------------------
# Notification (channel-agnostic)
# ---------------------------------------------------------------------------

NOTIFY_CHANNEL = os.environ.get("NOTIFY_CHANNEL", "none").lower()


def send_notification(message: str, plain_text: str = "") -> None:
    """Send notification via configured channel.

    Args:
        message: HTML-formatted message (used by Telegram).
        plain_text: Plain text fallback (used by Slack). Defaults to message stripped of HTML.
    """
    if NOTIFY_CHANNEL == "telegram":
        _send_telegram(message)
    elif NOTIFY_CHANNEL == "slack":
        _send_slack(plain_text or _strip_html(message))
    elif NOTIFY_CHANNEL == "whatsapp":
        _send_whatsapp(plain_text or _strip_html(message))
    # "none" or unrecognized — silently skip


def _strip_html(html: str) -> str:
    """Crude HTML tag removal for plain text fallback."""
    return re.sub(r"<[^>]+>", "", html)


def _send_telegram(message: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        log.warning("Telegram configured but TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID missing")
        return
    try:
        data = json.dumps({
            "chat_id": chat_id, "text": message,
            "parse_mode": "HTML", "disable_web_page_preview": True,
        }).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data, headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=HTTP_TIMEOUT)
    except Exception as e:
        # Never log the full exception — it may contain the bot token URL
        log.warning("Telegram notification failed (check token/chat_id config)")


def _send_slack(message: str) -> None:
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        log.warning("Slack configured but SLACK_WEBHOOK_URL missing")
        return
    try:
        data = json.dumps({"text": message}).encode()
        req = urllib.request.Request(
            webhook_url, data=data,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=HTTP_TIMEOUT)
    except Exception as e:
        # Never log full exception — may contain webhook URL with secrets
        log.warning("Slack notification failed (check SLACK_WEBHOOK_URL config)")


def _send_whatsapp(message: str) -> None:
    api_url = os.environ.get("WHATSAPP_API_URL", "https://graph.facebook.com/v21.0")
    token = os.environ.get("WHATSAPP_TOKEN", "")
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "")
    to = os.environ.get("WHATSAPP_TO", "")
    if not token or not phone_id or not to:
        log.warning("WhatsApp configured but WHATSAPP_TOKEN/WHATSAPP_PHONE_ID/WHATSAPP_TO missing")
        return
    try:
        data = json.dumps({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": message},
        }).encode()
        req = urllib.request.Request(
            f"{api_url}/{phone_id}/messages",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        urllib.request.urlopen(req, timeout=HTTP_TIMEOUT)
    except Exception as e:
        # Never log full exception — may contain bearer token
        log.warning("WhatsApp notification failed (check WHATSAPP_TOKEN/PHONE_ID config)")


# ---------------------------------------------------------------------------
# Comment resolution
# ---------------------------------------------------------------------------

def resolve_fixed_comments(repo: str, pr_number: int, head_sha: str) -> tuple[int, int]:
    threads = fetch_review_threads(repo, pr_number)
    unresolved = [t for t in threads if not t["is_resolved"]]
    if not unresolved:
        return 0, 0

    log.info("Found %d unresolved bot review threads", len(unresolved))

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

    prompt = (
        "You are checking whether previous code review comments have been fixed.\n\n"
        "For each comment, check the current code. Respond with JSON only:\n"
        '{"resolutions": [{"thread_id": "<id>", "resolved": true/false, "reason": "brief"}]}\n\n'
        "Be conservative: only resolved=true if confident the fix is correct.\n\n---\n\n"
    )
    for thread in unresolved:
        c = thread["comments"][0]
        path, line = c.get("path", "?"), c.get("line", "?")
        prompt += f"### Thread: {thread['thread_id']}\n**File:** `{path}` **Line:** {line}\n"
        prompt += f"**Comment:** {c['body'][:500]}\n\n"
        if path in file_contents:
            # Send only ±30 lines around the flagged line to avoid blowing context
            content = file_contents[path]
            if isinstance(line, int) and line > 0:
                lines = content.split("\n")
                start = max(0, line - 31)
                end = min(len(lines), line + 30)
                snippet = "\n".join(f"{i+1}: {l}" for i, l in enumerate(lines[start:end], start=start))
                prompt += f"**Current code (lines {start+1}-{end}):**\n```\n{snippet}\n```\n\n"
            else:
                prompt += f"**Current code:**\n```\n{content[:3000]}\n```\n\n"

    raw = call_bedrock(prompt)
    try:
        result = parse_json_response(raw)
    except json.JSONDecodeError:
        return 0, len(unresolved)

    known_ids = {t["thread_id"] for t in unresolved}
    resolved_count = 0
    for res in result.get("resolutions", []):
        if res.get("resolved") and res.get("thread_id") in known_ids:
            if resolve_thread(res["thread_id"]):
                resolved_count += 1

    return resolved_count, len(unresolved) - resolved_count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    repo = os.environ.get("REPO_NAME")
    pr_number_str = os.environ.get("PR_NUMBER")
    if not repo or not pr_number_str:
        log.error("Missing REPO_NAME or PR_NUMBER")
        sys.exit(1)

    try:
        pr_number = int(pr_number_str)
    except ValueError:
        log.error("PR_NUMBER must be a valid integer, got: %s", pr_number_str)
        sys.exit(1)
    log.info("Reviewing PR #%d in %s (model: %s)", pr_number, repo, MODEL_ID)

    pr = gh_get(f"/repos/{repo}/pulls/{pr_number}")
    pr_title, pr_body = pr["title"], (pr.get("body") or "")[:500]
    pr_author, head_sha = pr["user"]["login"], pr["head"]["sha"]

    resolved_count, still_open = resolve_fixed_comments(repo, pr_number, head_sha)

    files = gh_get_all(f"/repos/{repo}/pulls/{pr_number}/files")
    code_files = [f for f in files if not should_skip(f["filename"])]
    changed_lines = count_changed_lines(code_files)

    if len(code_files) > MAX_FILES or changed_lines > MAX_CHANGED_LINES:
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", {
            "body": f"## 🤖 AI Code Review\n\nPR too large ({len(code_files)} files, {changed_lines} lines). "
                    f"Limits: {MAX_FILES} files / {MAX_CHANGED_LINES} lines. Consider splitting.",
            "event": "COMMENT",
        })
        send_notification(f"🤖 AI Review skipped PR #{pr_number} — too large\n<a href=\"{pr['html_url']}\">{pr_title}</a>")
        return

    if not code_files:
        log.info("No reviewable files, skipping")
        return

    # Load review prompt
    prompt_path = Path(__file__).parent.parent / "prompts" / "review.md"
    if not prompt_path.exists():
        log.error("Review prompt not found: %s", prompt_path)
        sys.exit(1)
    prompt_template = prompt_path.read_text()

    file_context = []
    diff_maps: dict[str, dict[int, int]] = {}
    for f in code_files:
        filename = f["filename"]
        patch = f.get("patch", "")
        full_content = get_file_content(repo, filename, head_sha) or "(not found)"
        diff_maps[filename] = parse_diff_line_map(patch)
        file_context.append(
            f"### {filename}\n\n**Diff:**\n```diff\n{patch}\n```\n\n"
            f"**Full file:**\n```\n{full_content}\n```\n"
        )

    prompt = (
        f"{prompt_template}\n\n---\n\n## PR Under Review\n\n"
        f"**Title:** {pr_title}\n**Author:** {pr_author}\n**Description:** {pr_body}\n\n"
        f"---\n\n## Changed Files\n\n" + "\n".join(file_context)
    )

    log.info("Calling Bedrock for review...")
    raw_response = call_bedrock(prompt)

    try:
        review = parse_json_response(raw_response)
    except json.JSONDecodeError:
        log.error("Failed to parse review response")
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", {
            "body": "## 🤖 AI Code Review\n\n⚠️ Review failed — could not parse model response.",
            "event": "COMMENT",
        })
        sys.exit(1)

    findings = review.get("findings", [])
    summary_text = review.get("summary", "No summary.")
    highlights = review.get("highlights", [])
    pr_type = review.get("pr_type", "unknown")

    severity_counts: dict[str, int] = {}
    for f in findings:
        sev = f.get("severity", "LOW")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    inline_comments, low_findings = [], []
    for finding in findings:
        severity = finding.get("severity", "LOW")
        emoji = SEVERITY_EMOJI.get(severity, "📝")
        title, body_text = finding.get("title", "Issue"), finding.get("body", "")
        suggestion, filename = finding.get("suggestion", ""), finding.get("file", "")
        line = finding.get("line", 0)

        comment_body = f"{emoji} **{severity}: {title}**\n\n{body_text}"
        if suggestion:
            comment_body += f"\n\n**Fix:**\n```suggestion\n{suggestion}\n```"

        if severity in INLINE_SEVERITIES and filename and line:
            position = diff_maps.get(filename, {}).get(line)
            if position:
                inline_comments.append({"path": filename, "position": position, "body": comment_body})
            else:
                low_findings.append(f"- {emoji} **{title}** — `{filename}:{line}` — {body_text}")
        else:
            low_findings.append(f"- {emoji} **{title}** — `{filename}:{line}` — {body_text}")

    # Build review body
    review_body = f"## 🤖 AI Code Review — #{pr_number}: {pr_title}\n\n*Type: {pr_type}*\n\n{summary_text}\n\n"

    if highlights:
        review_body += "### 🟢 Highlights\n" + "".join(f"- {h}\n" for h in highlights) + "\n"

    if resolved_count > 0 or still_open > 0:
        review_body += "### 🔄 Previous Comments\n"
        if resolved_count > 0:
            review_body += f"- ✅ **{resolved_count}** auto-resolved\n"
        if still_open > 0:
            review_body += f"- ⏳ **{still_open}** still unresolved\n"
        review_body += "\n"

    if findings:
        counts_str = ", ".join(
            f"{count} {SEVERITY_EMOJI.get(sev, '')} {sev}"
            for sev, count in sorted(severity_counts.items(),
                key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
                if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99)
        )
        review_body += f"### Findings: {counts_str}\nSee inline comments.\n\n"
    else:
        review_body += "### ✅ No new issues found\n\n"

    if low_findings:
        review_body += "### Low Priority / Out-of-Diff\n" + "".join(f"{lf}\n" for lf in low_findings) + "\n"

    # Blockers = new CRITICAL/HIGH findings OR unresolved threads from previous reviews.
    # Unresolved prior threads count as blockers because they represent issues the reviewer
    # flagged that haven't been addressed yet. This is intentional — force resolution.
    has_blockers = severity_counts.get("CRITICAL", 0) > 0 or severity_counts.get("HIGH", 0) > 0 or still_open > 0

    # GitHub Actions outputs
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        findings_summary = "\n".join(
            f"- [{f.get('severity', 'LOW')}] {f.get('file', '?')}:{f.get('line', '?')} — "
            f"{f.get('title', '')}: {f.get('body', '')[:200]}"
            for f in findings
        )
        with open(gh_output, "a") as fh:
            fh.write(f"has_findings={'true' if has_blockers else 'false'}\n")
            d1, d2 = f"ghadelim_{uuid.uuid4().hex[:8]}", f"ghadelim_{uuid.uuid4().hex[:8]}"
            fh.write(f"findings_json<<{d1}\n{json.dumps(findings)}\n{d1}\n")
            fh.write(f"findings_summary<<{d2}\n{findings_summary}\n{d2}\n")

    if not has_blockers:
        review_body += "---\n\n## ✅ Ready for Merge\n\nNo unresolved blocking findings.\n"

    review_payload: dict = {"body": review_body, "event": "COMMENT"}
    if inline_comments:
        review_payload["comments"] = inline_comments

    try:
        gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", review_payload)
        log.info("Posted review with %d inline comments", len(inline_comments))
    except urllib.error.HTTPError:
        if inline_comments:
            review_payload.pop("comments", None)
            review_body += "\n*⚠️ Inline comments could not be placed.*\n"
            for c in inline_comments:
                review_body += f"\n- **{c['path']}** — {c['body'][:200]}...\n"
            review_payload["body"] = review_body
            try:
                gh_post(f"/repos/{repo}/pulls/{pr_number}/reviews", review_payload)
            except urllib.error.HTTPError:
                log.error("Failed to post review even without inline comments")
        else:
            log.error("Failed to post review (no inline comments to strip)")

    # Notification
    tg_resolved = f" | 🔄 {resolved_count} resolved" if resolved_count > 0 else ""
    if findings:
        tg_counts = " ".join(f"{SEVERITY_EMOJI.get(s, '')} {c} {s}" for s, c in sorted(severity_counts.items(),
            key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x[0])
            if x[0] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] else 99))
        ready = " — ✅ Ready for Merge" if not has_blockers else ""
        msg = f"🔍 <b>AI Review</b> — PR #{pr_number}{ready}\n{tg_counts}{tg_resolved}\n<a href=\"{pr['html_url']}\">{pr_title}</a>"
    else:
        ready = " — ✅ Ready for Merge" if not has_blockers else ""
        msg = f"✅ <b>AI Review</b> — PR #{pr_number}{ready}\nNo issues{tg_resolved}\n<a href=\"{pr['html_url']}\">{pr_title}</a>"
    send_notification(msg)

    log.info("Done! Blockers: %s", has_blockers)


if __name__ == "__main__":
    main()
