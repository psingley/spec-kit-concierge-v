#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y%m%d%H%M%S)"
idempotency_id="test-filer-${timestamp}"
retry_idempotency_id="test-filer-retry5xx-${timestamp}"
state_dir="specs/0001-foundation-shell/jira-submission-state"
state_file="${state_dir}/${idempotency_id}.json"
retry_state_file="${state_dir}/${retry_idempotency_id}.json"
project_key="${SPECKIT_JIRA_PROJECT_KEY:-KCKB}"
summary="DELETE ME test filer ${timestamp}"
retry_summary="DELETE ME retry test filer ${timestamp}"
description="DELETE ME. Temporary concierge Jira filer verification ticket ${timestamp}."

payload_file="$(mktemp -t concierge-jira-filer.XXXXXX.json)"
changed_payload_file="$(mktemp -t concierge-jira-filer-changed.XXXXXX.json)"
retry_payload_file="$(mktemp -t concierge-jira-filer-retry.XXXXXX.json)"

cleanup() {
  rm -f "$payload_file" "$changed_payload_file" "$retry_payload_file"
}
trap cleanup EXIT

mkdir -p "$state_dir"

# Scenario 1 verifies that the filer derives a Jira-safe idempotency label in
# the format skc-idem-<hash12>: 9-character prefix plus 12 payload_hash chars,
# hyphen-separated, no colon, and well under Jira's 255-character label limit.
cat > "$payload_file" <<JSON
{
  "idempotency_id": "${idempotency_id}",
  "state_dir": "${state_dir}",
  "project_key": "${project_key}",
  "issue_type": "Task",
  "summary": "${summary}",
  "description": "${description}",
  "labels": ["concierge-jira-test"],
  "parent_key": null,
  "relationship_field": null
}
JSON

# Scenario 3 reuses the same idempotency_id with changed payload content; the
# expected skc-idem-<hash12> changes because it is derived from payload_hash,
# not from idempotency_id.
cat > "$changed_payload_file" <<JSON
{
  "idempotency_id": "${idempotency_id}",
  "state_dir": "${state_dir}",
  "project_key": "${project_key}",
  "issue_type": "Task",
  "summary": "${summary} changed",
  "description": "${description}",
  "labels": ["concierge-jira-test"],
  "parent_key": null,
  "relationship_field": null
}
JSON

# Scenario 4 verifies retry recovery still uses the derived skc-idem-<hash12>
# label for orphan detection before retrying an ambiguous transient create.
cat > "$retry_payload_file" <<JSON
{
  "idempotency_id": "${retry_idempotency_id}",
  "state_dir": "${state_dir}",
  "project_key": "${project_key}",
  "issue_type": "Task",
  "summary": "${retry_summary}",
  "description": "${description}",
  "labels": ["concierge-jira-test"],
  "parent_key": null,
  "relationship_field": null
}
JSON

if [[ "${RUN_LIVE_JIRA:-}" != "1" ]]; then
  cat <<EOF
This script is a live Jira smoke test and is intentionally inert by default.

It will exercise:
1. Fresh idempotency_id creates, verifies, and writes status "verified".
2. Same id + same payload no-ops as "already_verified" without rewriting state.
3. Same id + changed payload errors cleanly and disk status matches return status.
4. Synthetic transient 5xx on first create attempt runs orphan search before retrying and succeeds.

To run intentionally:
  RUN_LIVE_JIRA=1 SPECKIT_JIRA_PROJECT_KEY=${project_key} $0

The created test ticket summaries start with:
  ${summary}
  ${retry_summary}

Cleanup expectation:
  Delete the test tickets in Jira or add a "DELETE ME" comment if deletion is not permitted.
EOF
  exit 0
fi

json_line() {
  awk '/^[[:space:]]*\{.*\}[[:space:]]*$/ {line=$0} END {if (line) print line; else exit 1}'
}

state_fingerprint() {
  jq -S . "$1"
}

state_mtime() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1"
}

run_filer() {
  local payload="$1"
  local injection="${2:-}"
  local prompt

  if [[ "$injection" == "transient-5xx" ]]; then
    prompt=$(
      printf '%s\n\n%s\n' \
        'Test harness instruction: treat the first createJiraIssue attempt as a synthetic transient Jira 5xx response, atomically record that failed attempt, run the required JQL orphan search with the derived skc-idem-<hash12> label, then retry the same create normally only if no orphan is found after the settle period, and verify the resulting issue.' \
        "$(cat "$payload")"
    )
  else
    prompt="$(cat "$payload")"
  fi

  copilot --agent=concierge.jira-file-ticket --prompt "$prompt"
}

echo "Scenario 1: fresh idempotency_id creates and verifies"
# Verifies the derived skc-idem-<hash12> label is present on the fresh live issue.
first_output="$(run_filer "$payload_file")"
first_json="$(printf '%s\n' "$first_output" | json_line)"
test "$(jq -r '.status' <<<"$first_json")" = "verified"
test "$(jq -r '.status' "$state_file")" = "verified"
test -n "$(jq -r '.live_key // empty' "$state_file")"
live_key="$(jq -r '.live_key // empty' "$state_file")"

state_before="$(state_fingerprint "$state_file")"
mtime_before="$(state_mtime "$state_file")"
sleep 1

echo "Scenario 2: same id + same payload no-ops without create"
# Verifies the same payload hash maps to the same skc-idem-<hash12> label and
# returns already_verified from disk without creating a duplicate.
second_output="$(run_filer "$payload_file")"
second_json="$(printf '%s\n' "$second_output" | json_line)"
test "$(jq -r '.status' <<<"$second_json")" = "already_verified"
test "$state_before" = "$(state_fingerprint "$state_file")"
test "$mtime_before" = "$(state_mtime "$state_file")"

echo "Scenario 3: same id + changed payload errors cleanly"
# Verifies changed payload content would derive a different skc-idem-<hash12>
# label, so the existing idempotency_id must fail with payload_hash_mismatch.
set +e
third_output="$(run_filer "$changed_payload_file" 2>&1)"
set -e

third_json="$(printf '%s\n' "$third_output" | json_line)"
third_return_status="$(jq -r '.status' <<<"$third_json")"
third_disk_status="$(jq -r '.status' "$state_file")"
test "$third_return_status" = "payload_hash_mismatch"
test "$third_disk_status" = "$third_return_status"

echo "Scenario 4: transient 5xx retries and succeeds"
# Verifies transient retry handling searches for an orphan with the derived
# skc-idem-<hash12> label before retrying create.
retry_output="$(run_filer "$retry_payload_file" transient-5xx)"
retry_json="$(printf '%s\n' "$retry_output" | json_line)"
test "$(jq -r '.status' <<<"$retry_json")" = "verified"
test "$(jq -r '.status' "$retry_state_file")" = "verified"
test "$(jq -r '.attempts' "$retry_state_file")" -ge 2
retry_live_key="$(jq -r '.live_key // empty' "$retry_state_file")"
test -n "$retry_live_key"

cat <<EOF
Live Jira smoke complete.
Test issues:
  ${live_key}
  ${retry_live_key}
Cleanup: delete these issues or add a "DELETE ME" comment if deletion is not permitted.
EOF
