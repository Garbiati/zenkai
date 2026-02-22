#!/usr/bin/env bash
# Hook: Remind to run tests before ending session if source files were changed

set -euo pipefail

LOG_FILE="/home/alessandro/zenkai/.claude/audit/agent-actions.log"

if [ ! -f "$LOG_FILE" ]; then
  exit 0
fi

# Check if any .ts source files (not test files) were modified in this session
# Look at last 50 log entries from today
TODAY=$(date -u +"%Y-%m-%d")
RECENT_CHANGES=$(grep "$TODAY" "$LOG_FILE" 2>/dev/null | grep -v "\.spec\.ts\|\.test\.ts" | grep "\.ts\b" || true)

if [ -n "$RECENT_CHANGES" ]; then
  echo "REMINDER: You modified TypeScript source files in this session."
  echo "Please ensure tests still pass before ending: cd backend && npm test"
  echo ""
  echo "Modified files (sample):"
  echo "$RECENT_CHANGES" | tail -5
fi

exit 0
