#!/usr/bin/env bash
# Hook: Block writing hardcoded secrets to files
# Reads the full tool input from stdin as JSON

set -euo pipefail

INPUT=$(cat)

# Extract file path and content from the JSON input
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path','')))" 2>/dev/null || echo "")
CONTENT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('content', d.get('new_string','')))" 2>/dev/null || echo "")

# Skip .env.example files — they're supposed to show variable names
if echo "$FILE_PATH" | grep -q "\.env\.example"; then
  exit 0
fi

# Skip .env files themselves (user manages those)
if echo "$FILE_PATH" | grep -qE "^\.env$|/\.env$"; then
  exit 0
fi

# Patterns that indicate hardcoded secrets
SECRET_PATTERNS=(
  "API_KEY=['\"][a-zA-Z0-9_\-]{16,}"
  "SECRET=['\"][a-zA-Z0-9_\-]{16,}"
  "PASSWORD=['\"][a-zA-Z0-9_\-]{8,}"
  "TOKEN=['\"][a-zA-Z0-9_\-]{16,}"
  "PRIVATE_KEY="
  "aws_secret_access_key"
  "-----BEGIN RSA PRIVATE KEY-----"
  "-----BEGIN EC PRIVATE KEY-----"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$CONTENT" | grep -qiP "$pattern" 2>/dev/null || echo "$CONTENT" | grep -qi "$pattern"; then
    echo "BLOCKED: Possible hardcoded secret detected (pattern: $pattern)"
    echo "Use environment variables instead. See backend/.env.example"
    exit 1
  fi
done

exit 0
