#!/usr/bin/env bash
# Hook: Block dangerous Bash commands
# Reads the full tool input from stdin as JSON

set -euo pipefail

INPUT=$(cat)

# Extract the command from the JSON input
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || echo "")

BLOCKED_PATTERNS=(
  "rm -rf /"
  "rm -rf \."
  "git push --force main"
  "git push -f main"
  "git push --force origin main"
  "kill -9 1"
  "DROP DATABASE"
  "DROP TABLE"
  "truncate"
  "> /dev/sda"
  "dd if="
  "chmod -R 777 /"
  "chown -R"
  "git reset --hard HEAD"
  "git clean -fd"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "BLOCKED: Dangerous command detected: '$pattern'"
    echo "If this is intentional, get explicit user approval first."
    exit 1
  fi
done

exit 0
