#!/usr/bin/env python3
"""
AI Code Review script — called by .github/workflows/ai-code-review.yml
Reads diff from /tmp/pr_diff_review.txt, calls Claude API, writes body to /tmp/review_body.txt.
All inputs via environment variables (no shell injection risk).
"""
import json
import os
import urllib.error
import urllib.request

api_key = os.environ.get("ANTHROPIC_API_KEY", "")
pr_title = os.environ.get("PR_TITLE", "")
repo = os.environ.get("GITHUB_REPOSITORY", "")

if not api_key:
    with open("/tmp/review_body.txt", "w") as f:
        f.write("*AI Code Review skipped: ANTHROPIC_API_KEY secret not configured.*")
    raise SystemExit(0)

with open("/tmp/pr_diff_review.txt") as f:
    diff = f.read()

SYSTEM_PROMPT = """You are a senior engineer reviewing a Pull Request for a NestJS + Next.js SaaS team activity dashboard.

Stack: NestJS 11, TypeORM, PostgreSQL, Next.js 14 App Router, TypeScript, Docker.

Key rules to check:
- Max 1 active task per team member (BUSINESS RULE)
- Time entries must have valid start/end times; open entries are auto-closed on heartbeat timeout
- JWT payloads must include orgId for multi-tenant isolation
- All DB queries must be scoped to orgId (no cross-tenant data leakage)
- No hardcoded secrets, IPs, or environment-specific values in code
- DTOs must use class-validator decorators (whitelist: true, transform: true)
- TypeScript: avoid `any`, use strict null checks

Review format (use markdown, be concise under 600 words):
## Summary
One sentence overall assessment.

## Issues Found
List only real problems (security, business rule violations, bugs). Skip style nits.
For each: **[SEVERITY: HIGH/MEDIUM/LOW]** `file:line` — description + suggested fix.

## Positives
1-2 things done well (optional, skip if none).

## Recommendation
APPROVE / REQUEST CHANGES / NEEDS DISCUSSION"""

payload = {
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 1200,
    "system": SYSTEM_PROMPT,
    "messages": [{"role": "user", "content": f'Review PR: "{pr_title}"\n\n```diff\n{diff}\n```'}],
}

req = urllib.request.Request(
    "https://api.anthropic.com/v1/messages",
    data=json.dumps(payload).encode(),
    headers={
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    },
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
        review_text = data["content"][0]["text"]
except urllib.error.HTTPError as e:
    review_text = f"AI review failed: HTTP {e.code} — {e.read().decode()}"
except Exception as e:
    review_text = f"AI review failed: {e}"

body = (
    "## \U0001f916 AI Code Review\n\n"
    + review_text
    + f"\n\n---\n*Reviewed by Claude (claude-haiku-4-5-20251001) · "
    + f"[Zenkai CI](https://github.com/{repo}/actions)*"
)

with open("/tmp/review_body.txt", "w") as f:
    f.write(body)

print("Review generated successfully")
