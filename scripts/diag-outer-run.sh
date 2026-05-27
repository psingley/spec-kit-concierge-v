#!/usr/bin/env bash
# diag-outer-run.sh — deterministic invocation of the outer concierge-jira
# agent (speckit.concierge-jira.specstoissues) with full session capture.
#
# Drives the outer agent against a SCOPED 5-ticket Phase-1 prompt and
# captures everything it does so we can verify the bash shell-out pattern.
#
# Captures (under /tmp/diag-outer-<timestamp>/):
#   stdout.txt, stderr.txt, exit-code.txt, session-id.txt,
#   events.jsonl, state-dir-before.txt, state-dir-after.txt,
#   state-records/*.json (every state file written during the run)

set -uo pipefail

STAMP=$(date +%s)
DIAG_DIR="/tmp/diag-outer-${STAMP}"
mkdir -p "$DIAG_DIR"

REPO="/Users/psingley/spec-kit-concierge-v"
STATE_DIR_REL="specs/0001-foundation-shell/jira-submission-state"
STATE_DIR_ABS="$REPO/$STATE_DIR_REL"

echo "outer-agent diag run, stamp=$STAMP"
echo "logs at $DIAG_DIR"

# 1. Snapshot state dir BEFORE
( cd "$REPO" && ls -la "$STATE_DIR_REL/" 2>&1 ) > "$DIAG_DIR/state-dir-before.txt"

# 2. Snapshot Copilot sessions BEFORE
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-before.txt"

# 3. Build the scoped prompt
PROMPT=$(cat <<'EOF'
SCOPED REAL RUN — file the Epic + Phase 1 Story + Phase 1 Subtasks ONLY (5 tickets total). This is a real Run 1 submission scoped to Phase 1, used to prove the outer-agent DAG-walking via bash shell-out to the per-ticket filer.

Source artifacts:
- specs/0001-foundation-shell/spec.md
- specs/0001-foundation-shell/plan.md
- specs/0001-foundation-shell/tasks.md
- .specify/extensions/concierge-jira/jira-config.yml

DAG to file (5 tickets):
1. Epic (idempotency_id: 0001-foundation-shell-epic-v4) — derived from spec.md.
2. Story 1 (idempotency_id: 0001-foundation-shell-phase-1-v4) — derived from plan.md Phase 1 "Generate the shell scaffold." Parent: the Epic's live_key from disk.
3. Subtask T001 (idempotency_id: 0001-foundation-shell-T001-v4) — from tasks.md T001. Parent: Story 1's live_key from disk.
4. Subtask T002 (idempotency_id: 0001-foundation-shell-T002-v4). Parent: Story 1's live_key from disk.
5. Subtask T003 (idempotency_id: 0001-foundation-shell-T003-v4). Parent: Story 1's live_key from disk.

RULES (NON-NEGOTIABLE):
- Skip the dry-run preview step. We've already approved the design.
- For EACH ticket, invoke the filer by shelling out via bash:
  copilot --agent=speckit.concierge-jira.file-ticket --allow-all-tools -p "$PAYLOAD"
- Do NOT use the in-session task tool. Do NOT use prose like "invoke the filer agent." Use bash, every time, every ticket.
- After each bash invocation, read the state file at specs/0001-foundation-shell/jira-submission-state/<idempotency_id>.json BEFORE constructing the next payload.
- Thread parent_key from the just-written state file's live_key field.
- All payloads use project_key: SKC, base labels: ["spec-kit", "concierge", "run-1"], relationship_field: "Parent" for Story-under-Epic and Subtask-under-Story, null for the Epic.
- STOP after all 5 land. Do NOT proceed to Phase 2-7. Do NOT write jira-mapping.json (skip step 10).
- If any filer returns non-verified, halt immediately and report the failed idempotency_id with state record contents.

At the end, output a verified-table with idempotency_id, status, live_key for all 5 plus the bash command output for each (just the single-line JSON return).
EOF
)

# 4. Invoke outer agent
cd "$REPO"
echo "--- invoking outer agent ---"
copilot --agent=speckit.concierge-jira.specstoissues --allow-all-tools -p "$PROMPT" \
  > "$DIAG_DIR/stdout.txt" 2> "$DIAG_DIR/stderr.txt"
RC=$?
echo "$RC" > "$DIAG_DIR/exit-code.txt"
echo "outer-agent exit code: $RC"

# 5. Identify the new session
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-after.txt"
NEW_SESSION=$(comm -23 <(sort "$DIAG_DIR/sessions-after.txt") <(sort "$DIAG_DIR/sessions-before.txt") | head -1)
if [ -z "$NEW_SESSION" ]; then
  NEW_SESSION=$(head -1 "$DIAG_DIR/sessions-after.txt")
fi
echo "$NEW_SESSION" > "$DIAG_DIR/session-id.txt"
echo "outer session id: $NEW_SESSION"

# 6. Copy events.jsonl
if [ -f ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl ]; then
  cp ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl "$DIAG_DIR/events.jsonl"
  echo "events: $(wc -l < $DIAG_DIR/events.jsonl) lines"
fi

# 7. Snapshot state dir AFTER + copy state records
ls -la "$STATE_DIR_REL/" 2>&1 > "$DIAG_DIR/state-dir-after.txt"
mkdir -p "$DIAG_DIR/state-records"
cp "$STATE_DIR_ABS"/0001-foundation-shell-*-v4.json "$DIAG_DIR/state-records/" 2>/dev/null || true

# 8. Summarize
echo "--- diag complete ---"
echo "state records captured: $(ls $DIAG_DIR/state-records/ 2>/dev/null | wc -l)"
echo "inspect: $DIAG_DIR/"
