#!/usr/bin/env bash
# fire-run-1-full.sh — fire the full Run 1 → SKC submission via the outer
# concierge-jira agent. v0.2.2 extension, gpt-5-mini filer, 0x cost.
#
# Idempotency convention enforced in prompt: 0001-foundation-shell-<slug>
# where slug is: "epic", "phase-N" (N=1..7), or "TNNN" (T001..T018).
#
# Pre-existing verified state records that will be skipped (SKC-20..24
# from the v0.2.1 diag using -v4 suffix) DO NOT collide with the
# canonical names this prompt uses; the full run will create FRESH
# tickets for Phase 1 too. That's intentional — we want the full run
# to be one coherent epic family with consistent prose.

set -uo pipefail

STAMP=$(date +%s)
DIAG_DIR="/tmp/run1-full-${STAMP}"
mkdir -p "$DIAG_DIR"

REPO="/Users/psingley/spec-kit-concierge-v"
STATE_DIR_REL="specs/0001-foundation-shell/jira-submission-state"
STATE_DIR_ABS="$REPO/$STATE_DIR_REL"

echo "Run 1 full submission, stamp=$STAMP"
echo "logs at $DIAG_DIR"

# Snapshot state before
( cd "$REPO" && ls -la "$STATE_DIR_REL/" 2>&1 ) > "$DIAG_DIR/state-dir-before.txt"
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-before.txt"

# Build the full Run 1 prompt
PROMPT=$(cat <<'EOF'
FULL RUN 1 SUBMISSION — file the complete Epic + 7 Stories + 18 Subtasks (26 tickets) into SKC project. This is THE real Run 1 submission, no longer scoped.

Source artifacts (read these first):
- specs/0001-foundation-shell/spec.md
- specs/0001-foundation-shell/plan.md
- specs/0001-foundation-shell/tasks.md
- specs/0001-foundation-shell/grill.md (background context, locked decisions)
- specs/0001-foundation-shell/jira-dryrun-preview.md (the 26-ticket preview I already approved — use as the prose source for each ticket's body)
- .specify/extensions/concierge-jira/jira-config.yml

DAG to file (26 tickets):
1 Epic + 7 Stories (one per Phase) + 18 Subtasks (T001-T018, distributed across Phases per tasks.md).

IDEMPOTENCY_ID convention (MANDATORY):
- Epic: `0001-foundation-shell-epic`
- Story per Phase: `0001-foundation-shell-phase-1` through `0001-foundation-shell-phase-7`
- Subtask per T-ID: `0001-foundation-shell-T001` through `0001-foundation-shell-T018`

These canonical IDs do NOT collide with the prior diag's `-v4` suffixed IDs (SKC-20..24). Fresh epic family will result.

RULES (NON-NEGOTIABLE):
- Skip the dry-run preview step. The preview was already approved (jira-dryrun-preview.md).
- For EACH ticket, shell out to a fresh Copilot process per the v0.2.2 protocol:
  copilot --agent=speckit.concierge-jira.file-ticket --allow-all-tools -p "$PAYLOAD"
- Do NOT use the in-session task tool. Use bash shell-out, every ticket.
- After each bash invocation, READ the state file at specs/0001-foundation-shell/jira-submission-state/<idempotency_id>.json BEFORE constructing the next payload.
- Thread parent_key from disk:
  - Story 1-7 use Epic's issue_key as parent_key, relationship_field: "Parent"
  - Subtask T-NNN uses its parent Phase Story's issue_key as parent_key, relationship_field: "Parent"
- All payloads use project_key: "SKC", base labels: ["spec-kit", "concierge", "run-1"]
- Use the gold-standard ticket contract from jira-dryrun-preview.md for descriptions: Epic = Key outcomes / Scope constraints / Acceptance highlights; Story = As-a / I-want / so-that + Gherkin acceptance criteria + Goal + Independent Test + Why + Implementation outline; Subtask = Contributes to / Work / Done when
- Sequence: Epic first → 7 Stories sequentially → 18 Subtasks one Phase at a time. Do NOT interleave Subtasks across Phases.
- Subtask phase membership comes from tasks.md (T001-T003 → Phase 1, T004-T006 → Phase 2, etc — verify against the file).

HALT-ON-FAILURE:
If any filer returns non-verified (status != "verified") OR if the state file is missing/malformed, halt immediately. Report the failed idempotency_id, the state directory, and the state record contents. Do NOT continue to later DAG nodes.

AT THE END (only if all 26 verify):
- Write jira-mapping.json per the protocol Step 10
- Output a verified-table for all 26: idempotency_id, status, live_key

If anything fails mid-run, idempotency means a re-fire is safe — already-verified tickets will be detected and skipped.
EOF
)

# Fire the outer agent
cd "$REPO"
echo "--- invoking outer agent ---"
echo "$(date +%s) outer agent invocation start" >> "$DIAG_DIR/timing.log"
copilot --agent=speckit.concierge-jira.specstoissues --allow-all-tools -p "$PROMPT" \
  > "$DIAG_DIR/stdout.txt" 2> "$DIAG_DIR/stderr.txt"
RC=$?
echo "$RC" > "$DIAG_DIR/exit-code.txt"
echo "$(date +%s) outer agent invocation end (rc=$RC)" >> "$DIAG_DIR/timing.log"
echo "outer-agent exit code: $RC"

# Identify the outer session
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-after.txt"
NEW_SESSION=$(comm -23 <(sort "$DIAG_DIR/sessions-after.txt") <(sort "$DIAG_DIR/sessions-before.txt") | head -1)
if [ -z "$NEW_SESSION" ]; then
  NEW_SESSION=$(head -1 "$DIAG_DIR/sessions-after.txt")
fi
echo "$NEW_SESSION" > "$DIAG_DIR/session-id.txt"
echo "outer session id: $NEW_SESSION"

# Copy events.jsonl
if [ -f ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl ]; then
  cp ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl "$DIAG_DIR/events.jsonl"
  echo "events: $(wc -l < $DIAG_DIR/events.jsonl) lines"
fi

# Snapshot state dir AFTER + copy all canonical state records
ls -la "$STATE_DIR_REL/" 2>&1 > "$DIAG_DIR/state-dir-after.txt"
mkdir -p "$DIAG_DIR/state-records"
cp "$STATE_DIR_ABS"/0001-foundation-shell-epic.json "$DIAG_DIR/state-records/" 2>/dev/null || true
cp "$STATE_DIR_ABS"/0001-foundation-shell-phase-*.json "$DIAG_DIR/state-records/" 2>/dev/null || true
cp "$STATE_DIR_ABS"/0001-foundation-shell-T*.json "$DIAG_DIR/state-records/" 2>/dev/null || true

# Summarize
echo "--- run 1 fire complete ---"
RECORDS=$(ls "$DIAG_DIR/state-records/" 2>/dev/null | wc -l | tr -d ' ')
echo "state records captured: $RECORDS"
echo "inspect: $DIAG_DIR/"
echo ""
echo "verdict summary:"
for f in "$DIAG_DIR/state-records"/*.json; do
  [ -f "$f" ] || continue
  jq -r '"\(.idempotency_id) → \(.status) → \(.issue_key // .live_key // "n/a")"' "$f" 2>/dev/null
done
