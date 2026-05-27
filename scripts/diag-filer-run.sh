#!/usr/bin/env bash
# diag-filer-run.sh — deterministic single-shot of the filer agent with
# full session logging so we can see what it actually does.
#
# Usage: diag-filer-run.sh <idempotency_id> <issue_type> [parent_key]
#
# Captures:
#   /tmp/diag-filer-<id>/stdout.txt
#   /tmp/diag-filer-<id>/stderr.txt
#   /tmp/diag-filer-<id>/session-id.txt
#   /tmp/diag-filer-<id>/events.jsonl   (copy of Copilot session events)
#   /tmp/diag-filer-<id>/state-dir-before.txt   (ls before)
#   /tmp/diag-filer-<id>/state-dir-after.txt    (ls after)
#   /tmp/diag-filer-<id>/state-record.json      (if filer wrote it)
#   /tmp/diag-filer-<id>/jira-issue.json        (if filer created a ticket; resolved by idempotency label)

set -uo pipefail

IDEMP="${1:?usage: diag-filer-run.sh <idempotency_id> <issue_type> [parent_key]}"
ITYPE="${2:?usage: diag-filer-run.sh <idempotency_id> <issue_type> [parent_key]}"
PARENT="${3:-null}"

DIAG_DIR="/tmp/diag-filer-${IDEMP}"
mkdir -p "$DIAG_DIR"
echo "diag run for idempotency_id=$IDEMP issue_type=$ITYPE parent=$PARENT"
echo "logs at $DIAG_DIR"

REPO="/Users/psingley/spec-kit-concierge-v"
STATE_DIR="specs/0001-foundation-shell/jira-submission-state"

# 1. Snapshot state dir BEFORE
( cd "$REPO" && ls -la "$STATE_DIR/" 2>&1 ) > "$DIAG_DIR/state-dir-before.txt"

# 2. Build payload
PARENT_JSON="null"
RELATIONSHIP_JSON="null"
if [ "$PARENT" != "null" ]; then
  PARENT_JSON="\"$PARENT\""
  RELATIONSHIP_JSON="\"Parent\""
fi

cat > "$DIAG_DIR/payload.json" <<EOF
{
  "idempotency_id": "$IDEMP",
  "state_dir": "$STATE_DIR",
  "project_key": "SKC",
  "issue_type": "$ITYPE",
  "summary": "DIAG $IDEMP — single-shot filer test",
  "description": "Diagnostic ticket. Single-shot filer invocation with full session logging. Safe to delete.",
  "labels": ["spec-kit", "concierge", "diag"],
  "parent_key": $PARENT_JSON,
  "relationship_field": $RELATIONSHIP_JSON
}
EOF
echo "payload at $DIAG_DIR/payload.json"

# 3. Get sessions list before the run so we can identify the new one
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-before.txt"

# 4. Invoke filer agent directly
cd "$REPO"
echo "--- invoking copilot ---"
PAYLOAD=$(cat "$DIAG_DIR/payload.json")
copilot --agent=concierge.jira-file-ticket --allow-all-tools -p "$PAYLOAD" \
  > "$DIAG_DIR/stdout.txt" 2> "$DIAG_DIR/stderr.txt"
RC=$?
echo "copilot exit code: $RC"
echo "$RC" > "$DIAG_DIR/exit-code.txt"

# 5. Identify the new session
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-after.txt"
NEW_SESSION=$(comm -23 <(sort "$DIAG_DIR/sessions-after.txt") <(sort "$DIAG_DIR/sessions-before.txt") | head -1)
if [ -z "$NEW_SESSION" ]; then
  # Fallback: latest session
  NEW_SESSION=$(head -1 "$DIAG_DIR/sessions-after.txt")
fi
echo "$NEW_SESSION" > "$DIAG_DIR/session-id.txt"
echo "session id: $NEW_SESSION"

# 6. Copy events.jsonl from that session
if [ -f ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl ]; then
  cp ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl "$DIAG_DIR/events.jsonl"
  echo "events: $(wc -l < $DIAG_DIR/events.jsonl) lines"
fi

# 7. Snapshot state dir AFTER
ls -la "$STATE_DIR/" 2>&1 > "$DIAG_DIR/state-dir-after.txt"

# 8. Try to find the state record
STATE_FILE="$STATE_DIR/$IDEMP.json"
if [ -f "$STATE_FILE" ]; then
  cp "$STATE_FILE" "$DIAG_DIR/state-record.json"
  echo "state record: WROTE"
else
  echo "state record: MISSING"
fi

echo "--- diag complete ---"
echo "Inspect: $DIAG_DIR/"
