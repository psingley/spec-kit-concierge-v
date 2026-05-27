#!/usr/bin/env bash
# fire-implement.sh — deterministic invocation of /speckit.implement against
# Run 1 with full session capture. Same pattern as fire-run-1-full.sh.
#
# Captures (under /tmp/implement-<timestamp>/):
#   stdout.txt, stderr.txt, exit-code.txt, session-id.txt,
#   events.jsonl, state-dir-before.txt, state-dir-after.txt,
#   git-status-before.txt, git-status-after.txt, files-created.txt

set -uo pipefail

STAMP=$(date +%s)
DIAG_DIR="/tmp/implement-${STAMP}"
mkdir -p "$DIAG_DIR"

REPO="/Users/psingley/spec-kit-concierge-v"
SPEC_NAME="0001-foundation-shell"

echo "Run 1 /speckit.implement, stamp=$STAMP"
echo "logs at $DIAG_DIR"

# Snapshot BEFORE
( cd "$REPO" && git status --short ) > "$DIAG_DIR/git-status-before.txt"
( cd "$REPO" && find . -maxdepth 2 -type f -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null | sort ) > "$DIAG_DIR/files-before.txt"
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-before.txt"

# Prompt
PROMPT=$(cat <<'EOF'
RUN 1 IMPLEMENT — execute /speckit.implement against specs/0001-foundation-shell.

Source artifacts (read these first):
- specs/0001-foundation-shell/spec.md (12 FRs, 3 SCs, 3 User Stories)
- specs/0001-foundation-shell/plan.md (7-phase build sequence)
- specs/0001-foundation-shell/tasks.md (T001-T018 across 7 phases)
- specs/0001-foundation-shell/research.md (5 decisions)
- specs/0001-foundation-shell/grill.md (locked Q&As)
- docs/adr/0001-nsis-installer.md
- docs/adr/0002-factory-pattern-no-runtime-schema.md
- .github/copilot-instructions.md (Run 1 conventions block)
- .specify/memory/constitution.md (esp. Principles I, IV, V, XVI)
- ROADMAP_DECISIONS.md (esp. Phase A Run 1 scope)

Execute every task T001-T018 in dependency order per tasks.md. Honor:
- Phase 1: scaffold from electron-forge/vite-typescript template
- Phase 2: TS strict + noUncheckedIndexedAccess; ESLint Pure/Effect at error
- Phase 3: npm script contract (dev, lint, lint:fix, typecheck, test, test:coverage, test:watch, e2e, package, make)
- Phase 4: Vitest + RTL co-located; Playwright via _electron API with one smoke test asserting window opens + title matches + zero console errors
- Phase 5: pino logging to app.getPath('userData')/logs/
- Phase 6: NSIS via @electron-forge/maker-nsis; Windows-only; no auto-update
- Phase 7: GitHub Actions workflow on Windows-only matrix

NON-GOALS (do NOT implement, per spec.md FR-012):
- No factories (Run 2+)
- No runtime schema libraries (constitution v1.0.3 — factory pattern only)
- No Redux slices (Run 4)
- No IPC handlers (Run 4)
- No UI components beyond blank shell
- No business logic
- No HTTP API endpoints (Run 10)
- No MCP detection
- No ACP client
- No spec-kit hook implementations

Acceptance criteria from spec.md (verify these pass after implementation):
- SC-001: npm run dev launches a blank Electron window
- SC-002: npm run test:coverage succeeds with zero tests
- SC-003: npm run e2e succeeds with one Playwright smoke test (window-opens + title-matches + zero-console-errors)

After all 18 tasks complete and the three acceptance criteria pass, output a summary of files created/modified and a brief verification that each SC was checked.
EOF
)

# Fire outer copilot session in foreground (we wait)
cd "$REPO"
echo "--- invoking copilot --agent=speckit.implement ---"
echo "$(date +%s) implement start" >> "$DIAG_DIR/timing.log"
copilot --agent=speckit.implement --allow-all-tools -p "$PROMPT" \
  > "$DIAG_DIR/stdout.txt" 2> "$DIAG_DIR/stderr.txt"
RC=$?
echo "$RC" > "$DIAG_DIR/exit-code.txt"
echo "$(date +%s) implement end (rc=$RC)" >> "$DIAG_DIR/timing.log"
echo "implement exit code: $RC"

# Identify session
ls -t ~/.copilot/session-state/ > "$DIAG_DIR/sessions-after.txt"
NEW_SESSION=$(comm -23 <(sort "$DIAG_DIR/sessions-after.txt") <(sort "$DIAG_DIR/sessions-before.txt") | head -1)
if [ -z "$NEW_SESSION" ]; then
  NEW_SESSION=$(head -1 "$DIAG_DIR/sessions-after.txt")
fi
echo "$NEW_SESSION" > "$DIAG_DIR/session-id.txt"
echo "session id: $NEW_SESSION"

# Copy events.jsonl
if [ -f ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl ]; then
  cp ~/.copilot/session-state/"$NEW_SESSION"/events.jsonl "$DIAG_DIR/events.jsonl"
  echo "events: $(wc -l < $DIAG_DIR/events.jsonl) lines"
fi

# Snapshot AFTER
( cd "$REPO" && git status --short ) > "$DIAG_DIR/git-status-after.txt"
( cd "$REPO" && find . -maxdepth 4 -type f -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null | sort ) > "$DIAG_DIR/files-after.txt"
diff "$DIAG_DIR/files-before.txt" "$DIAG_DIR/files-after.txt" | grep "^>" | sed 's/^> //' > "$DIAG_DIR/files-created.txt"

# Summarize
echo "--- implement complete ---"
echo "files created: $(wc -l < $DIAG_DIR/files-created.txt | tr -d ' ')"
echo "git status changes: $(wc -l < $DIAG_DIR/git-status-after.txt | tr -d ' ')"
echo "inspect: $DIAG_DIR/"
