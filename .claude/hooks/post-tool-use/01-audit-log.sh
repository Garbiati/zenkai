#!/usr/bin/env bash
# Hook: Audit log for file modifications and bash commands
# Reads the full tool input from stdin as JSON

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name','unknown'))" 2>/dev/null || echo "unknown")
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path','')))" 2>/dev/null || echo "")

LOG_DIR="/home/alessandro/zenkai/.claude/audit"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/agent-actions.log"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -n "$FILE_PATH" ]; then
  echo "$TIMESTAMP | $TOOL_NAME | $FILE_PATH" >> "$LOG_FILE"
elif [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command','')[:100])" 2>/dev/null || echo "")
  echo "$TIMESTAMP | Bash | $COMMAND" >> "$LOG_FILE"
fi

exit 0
