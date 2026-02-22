#!/usr/bin/env bash
# Hook: Warn when editing protected/immutable zones
# Reads the full tool input from stdin as JSON

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path','')))" 2>/dev/null || echo "")

# IMUTÁVEL — require ADR + explicit approval
IMMUTABLE_PATTERNS=(
  "docs/BUSINESS_RULES.md"
  "src/auth/"
  "task.entity.ts"
  "task-time-entry.entity.ts"
)

# PROTEGIDO — require justification
PROTECTED_PATTERNS=(
  "\.module\.ts$"
  "lib/auth\.tsx"
  "docker-compose\.yml"
  "tsconfig\.json"
  "package\.json"
)

for pattern in "${IMMUTABLE_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -q "$pattern"; then
    echo "WARNING: You are editing an IMUTÁVEL zone: $FILE_PATH"
    echo "This file requires an ADR (Architecture Decision Record) and explicit developer approval."
    echo "Use the /adr skill first. See docs/adr/ for examples."
    echo ""
    echo "If you have already created an ADR and have approval, proceed carefully."
    # Warn but don't block — user approval was presumably obtained
    exit 0
  fi
done

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    echo "WARNING: You are editing a PROTEGIDO zone: $FILE_PATH"
    echo "This requires a justification. Ensure you have a clear reason before proceeding."
    # Warn but don't block
    exit 0
  fi
done

exit 0
