"""Tests for ai_review.py."""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

# Add parent to path so we can import the module
import sys
sys.path.insert(0, os.path.dirname(__file__))

import ai_review


class TestParseFindings:
    """Tests for parse_findings()."""

    def test_parses_json_block(self) -> None:
        review = '''Here are the findings:

```json
[
  {
    "severity": "HIGH",
    "title": "Missing auth check",
    "file": "backend/handlers/runs.py",
    "line": 42,
    "body": "No userId validation",
    "suggestion": "Add userId check"
  }
]
```

That's all.'''
        findings = ai_review.parse_findings(review)
        assert len(findings) == 1
        assert findings[0]["severity"] == "HIGH"
        assert findings[0]["file"] == "backend/handlers/runs.py"

    def test_empty_json_array(self) -> None:
        review = "Everything looks good!\n\n```json\n[]\n```"
        findings = ai_review.parse_findings(review)
        assert findings == []

    def test_no_json_block(self) -> None:
        review = "This code looks fine, no issues found."
        findings = ai_review.parse_findings(review)
        assert findings == []

    def test_invalid_json(self) -> None:
        review = "```json\n{not valid json}\n```"
        findings = ai_review.parse_findings(review)
        assert findings == []

    def test_multiple_findings(self) -> None:
        review = '''```json
[
  {"severity": "CRITICAL", "title": "SQL injection", "file": "a.py", "line": 1, "body": "bad", "suggestion": "fix"},
  {"severity": "LOW", "title": "Naming", "file": "b.py", "line": 2, "body": "meh", "suggestion": "rename"}
]
```'''
        findings = ai_review.parse_findings(review)
        assert len(findings) == 2
        assert findings[0]["severity"] == "CRITICAL"
        assert findings[1]["severity"] == "LOW"


class TestFormatReviewComment:
    """Tests for format_review_comment()."""

    def test_no_findings(self) -> None:
        comment = ai_review.format_review_comment("Looks good", [])
        assert "No actionable findings" in comment
        assert "AI Code Review" in comment

    def test_with_findings(self) -> None:
        findings = [
            {
                "severity": "HIGH",
                "title": "Missing validation",
                "file": "handler.py",
                "line": 10,
                "body": "No input validation",
                "suggestion": "Add validation",
            }
        ]
        comment = ai_review.format_review_comment("review text", findings)
        assert "**1** issue(s)" in comment
        assert "HIGH" in comment
        assert "Missing validation" in comment
        assert "`handler.py:10`" in comment


class TestWriteGithubOutputs:
    """Tests for write_github_outputs()."""

    def test_writes_outputs_with_findings(self) -> None:
        findings = [
            {
                "severity": "HIGH",
                "title": "Bug found",
                "file": "app.py",
                "line": 5,
                "body": "Off by one",
                "suggestion": "Use <= instead of <",
            },
            {
                "severity": "LOW",
                "title": "Style issue",
                "file": "utils.py",
                "line": 10,
                "body": "Bad naming",
                "suggestion": "Rename",
            },
        ]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            output_file = f.name

        try:
            with patch.dict(os.environ, {"GITHUB_OUTPUT": output_file}):
                ai_review.write_github_outputs(findings)

            content = open(output_file).read()
            assert "has_findings=true" in content
            assert "findings_json<<FINDINGS_EOF" in content
            assert "FINDINGS_EOF" in content
            assert "findings_summary<<SUMMARY_EOF" in content
            assert "SUMMARY_EOF" in content
            assert '"severity": "HIGH"' in content
            assert "1. [HIGH] Bug found" in content
        finally:
            os.unlink(output_file)

    def test_writes_false_when_only_low_findings(self) -> None:
        findings = [
            {"severity": "LOW", "title": "Style", "file": "a.py", "line": 1, "body": "x"},
        ]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            output_file = f.name

        try:
            with patch.dict(os.environ, {"GITHUB_OUTPUT": output_file}):
                ai_review.write_github_outputs(findings)

            content = open(output_file).read()
            assert "has_findings=false" in content
        finally:
            os.unlink(output_file)

    def test_no_github_output_env(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            # Should not raise
            ai_review.write_github_outputs([])


class TestLoadPrompt:
    """Tests for load_prompt()."""

    def test_loads_review_prompt(self) -> None:
        prompt = ai_review.load_prompt()
        assert "RunMapRepeat" in prompt
        assert "severity" in prompt.lower() or "CRITICAL" in prompt
