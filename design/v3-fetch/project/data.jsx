// Mock data for the prototype

const REPOS = [
  { name: "concierge-api",       lang: "ts", meta: "main",    stars: 24, lastUsed: "2h ago"     },
  { name: "concierge-web",       lang: "ts", meta: "main",    stars: 18, lastUsed: "yesterday"  },
  { name: "concierge-mobile",    lang: "ts", meta: "develop", stars: 12, lastUsed: "3d ago"     },
  { name: "booking-engine",      lang: "go", meta: "main",    stars: 42, lastUsed: "1w ago"     },
  { name: "itinerary-service",   lang: "go", meta: "main",    stars: 31 },
  { name: "pricing-rules",       lang: "py", meta: "main",    stars: 9  },
  { name: "guest-profile-svc",   lang: "ts", meta: "main",    stars: 14 },
  { name: "supplier-sync",       lang: "py", meta: "main",    stars: 7  },
  { name: "loyalty-ledger",      lang: "rs", meta: "main",    stars: 5  },
  { name: "ops-dashboard",       lang: "ts", meta: "main",    stars: 22 },
  { name: "concierge-shared-ui", lang: "ts", meta: "main",    stars: 8  },
  { name: "incident-bot",        lang: "py", meta: "main",    stars: 4  },
  { name: "voucher-redeem",      lang: "go", meta: "main",    stars: 11 },
  { name: "data-warehouse-etl",  lang: "py", meta: "main",    stars: 16 },
];

const SAMPLE_PROMPT = "Add a self-serve flight-change flow so loyalty-tier guests can rebook within ±48h of departure without calling the concierge desk. Must respect existing rebook rules, push events to the itinerary service, and surface a confirmation receipt in the guest app.";

const SPEC_MD = `---
spec: 0042-self-serve-flight-change
status: draft
owners: ["@a.kim", "@concierge-pm"]
generated: 2026-05-19T14:02Z
---

# Self-serve flight-change for loyalty guests

## Problem
Loyalty-tier guests currently must call the concierge desk to change a flight inside the ±48h departure window. This bottlenecks the desk during weather events and leaves guests waiting on hold an average of 8 minutes. The mobile app should let them self-serve when rebook rules are met.

## Goals
- Reduce desk volume for in-window changes by **60%** in Q3.
- Maintain **<1.5s** rebook search latency at p95.
- Keep guest-facing failure rate **under 0.5%**.
- No regression to existing supplier-side rebook contracts.

## Non-goals
- New-bookings flow (out of scope).
- Multi-leg itineraries with >2 connecting flights.
- Loyalty-tier upgrades from inside the change flow.

## User stories
1. As a Gold-tier guest, I can open my itinerary and tap "Change flight" to see eligible alternatives.
2. As a Platinum-tier guest, I can change a flight for myself **and** linked travel companions in one transaction.
3. As an ops agent, I can see in the dashboard which self-serve changes hit the manual-review queue and why.

## Acceptance criteria
- [ ] Eligibility check runs in <200ms p95 against rebook-rules service.
- [ ] Alternatives list is sorted by fare-difference, then departure delta.
- [ ] Confirmation receipt is delivered via guest-app push **and** email within 30s.
- [ ] Failed transactions roll back the itinerary-service write atomically.
- [ ] Audit event is written to loyalty-ledger for every successful change.

## Dependencies
| System              | Owner          | Contract        |
|---------------------|----------------|-----------------|
| rebook-rules svc    | @booking-team  | gRPC v3         |
| itinerary-service   | @ops-platform  | REST v2 + SQS   |
| loyalty-ledger      | @loyalty       | append-only log |
| guest-app push      | @mobile        | FCM topic       |

## Out of scope clarifications needed
> The following ambiguities will be resolved in the next step.

- Refund handling when new fare is lower
- Eligibility for award-ticket bookings
- Behavior when companion-traveler bookings span tiers
- Whether change quotas reset on cancel-and-rebook
- Offline / poor-connection retry policy

## Open risks
- Supplier API throttling during weather events could push us over the latency budget. We may need to pre-warm caches.
- Loyalty-ledger throughput has not been load-tested above 80 events/sec; in-window change spikes could exceed that.

## Notes
This spec was drafted by Copilot CLI from the provided prompt and grounded against existing repo conventions found in \`concierge-api\` and \`booking-engine\`. See the activity stream for the full evidence chain.

---

*End of spec — scroll-through complete unlocks the Clarify step.*
`;

const CLARIFY_QUESTIONS = [
  {
    id: "Q1",
    text: "When the new fare is lower than the original, how should the difference be handled?",
    context: "Found 3 conflicting precedents in pricing-rules.md and supplier-sync README.",
    choices: [
      { key: "A", label: "Refund the difference to original payment method", sub: "Matches concierge-desk current behavior. Requires supplier credit." },
      { key: "B", label: "Issue future-travel credit at face value",            sub: "Higher margin. Loyalty engagement +8% in pilot." },
      { key: "C", label: "Hold credit at the original fare; no refund",         sub: "Simplest. Matches award-ticket policy already in prod." },
    ],
  },
  {
    id: "Q2",
    text: "For companion travelers on a Platinum-tier booking, should the change apply to everyone on the PNR or only the booking owner?",
    context: "Spec mentions companion rebooking but does not specify the default.",
    choices: [
      { key: "A", label: "Always change all travelers on the PNR",          sub: "Lower abandonment risk. Some companions may not consent." },
      { key: "B", label: "Default to all, with explicit opt-out per leg",   sub: "Best UX. Requires a confirm step in the mobile flow." },
      { key: "C", label: "Owner only, prompt to add companions separately", sub: "Safest legally. Doubles the touch count." },
    ],
  },
  {
    id: "Q3",
    text: "Are award-ticket (loyalty-points) bookings eligible for this self-serve flow?",
    context: "Award tickets use a separate fare-difference calc and aren't in the rebook-rules v3 schema.",
    choices: [
      { key: "A", label: "Yes — include award tickets in v1",      sub: "Requires a rebook-rules schema migration. Adds ~2 weeks." },
      { key: "B", label: "No — punt to v2; keep desk-only for now", sub: "Ships faster. ~12% of in-window changes are award." },
    ],
  },
  {
    id: "Q4",
    text: "If a guest cancels their self-serve change within 10 minutes, should it consume their per-trip change quota?",
    context: "Loyalty terms list 1 free change per trip. Behavior on cancel-and-rebook is unspecified.",
    choices: [
      { key: "A", label: "No — full free retry within a 10-min window",  sub: "Most generous. Matches airline industry norm." },
      { key: "B", label: "No — within window AND only if reverted to original itinerary", sub: "Stricter. Reduces churn-the-quota abuse." },
      { key: "C", label: "Yes — quota consumed on confirm, no exceptions", sub: "Cleanest accounting. Worst guest experience." },
    ],
  },
];

const TASKS = [
  { id: "T-01", area: "fe", title: "Add flight-change entry point to itinerary screen",         est: "2d" },
  { id: "T-02", area: "fe", title: "Build alternatives list view with fare-diff sort",          est: "3d" },
  { id: "T-03", area: "fe", title: "Companion-traveler opt-out confirm modal",                  est: "1d" },
  { id: "T-04", area: "fe", title: "Receipt screen + push-notification deep link",              est: "1d" },
  { id: "T-05", area: "be", title: "New endpoint POST /itineraries/:id/change",                 est: "2d" },
  { id: "T-06", area: "be", title: "Eligibility gateway calling rebook-rules v3",               est: "2d" },
  { id: "T-07", area: "be", title: "Atomic rollback handler across itinerary + ledger writes",  est: "3d" },
  { id: "T-08", area: "be", title: "Award-ticket eligibility gate (feature-flagged off)",       est: "1d" },
  { id: "T-09", area: "db", title: "Loyalty-ledger append throughput load test ≥120 ev/s",      est: "2d" },
  { id: "T-10", area: "be", title: "Supplier rate-limit / circuit-breaker around weather spikes", est: "2d" },
  { id: "T-11", area: "qa", title: "E2E test matrix — 6 tiers × 4 fare deltas",                 est: "2d" },
  { id: "T-12", area: "qa", title: "Chaos test: failed write rollback parity",                  est: "1d" },
];

// initial log seed - will be appended to as we move through steps
const COPILOT_MODELS = [
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5",   tag: "default" },
  { id: "claude-opus-4-1",   label: "Claude Opus 4.1",     tag: "premium" },
  { id: "gpt-5",             label: "GPT-5",               tag: "" },
  { id: "gpt-5-mini",        label: "GPT-5 mini",          tag: "fast" },
  { id: "gpt-5-codex",       label: "GPT-5 Codex",         tag: "code" },
  { id: "o3",                label: "o3",                  tag: "reason" },
  { id: "gemini-2.5-pro",    label: "Gemini 2.5 Pro",      tag: "" },
];

const INITIAL_LOG = [
  { t: "00:00:00", k: "info", g: "•", m: "Concierge ready. Awaiting workspace." },
];

const BRANCHES = {
  "concierge-api": [
    { name: "spec/0042-self-serve-flight-change",  step: "plan",    timestamp: "2h ago",     by: "a.kim" },
    { name: "spec/0039-loyalty-tier-refund-rules", step: "final",   timestamp: "3d ago",     by: "a.kim" },
    { name: "spec/0037-companion-pnr-merge",       step: "tasks",   timestamp: "1w ago",     by: "a.kim" },
    { name: "spec/0033-rate-card-renewals",        step: "clarify", timestamp: "2w ago",     by: "a.kim" },
  ],
  "concierge-web": [
    { name: "spec/0041-mobile-handoff",            step: "analyze", timestamp: "1d ago",     by: "a.kim" },
    { name: "spec/0036-itinerary-redesign",        step: "final",   timestamp: "10d ago",    by: "a.kim" },
  ],
  "concierge-mobile": [
    { name: "spec/0038-offline-rebook-queue",      step: "specify", timestamp: "3d ago",     by: "a.kim" },
  ],
  "booking-engine": [
    { name: "spec/0040-supplier-circuit-breaker",  step: "tasks",   timestamp: "1w ago",     by: "a.kim" },
  ],
};

const EVIDENCE_FILES = {
  "spec.md": {
    size: "4.1 KB",
    kind: "markdown",
    content: SPEC_MD,
  },
  "clarifications.md": {
    size: "1.8 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T14:18Z
---

# Clarifications

Resolved during the clarify step. Decisions feed forward into plan.md and tasks.md.

## Q1 — Lower fare handling
**Decision:** Issue future-travel credit at face value (option B).

Refund-to-card was rejected because supplier credit timing puts it outside the loyalty-tier SLA. Hold-at-original-fare was rejected because it conflicts with the published self-serve experience promise.

## Q2 — Companion travelers
**Decision:** Default to all travelers on the PNR, with explicit opt-out per leg (option B).

Reduces friction for the common case while preserving consent. Mobile flow adds a confirm step listing each companion with a toggle.

## Q3 — Award-ticket eligibility
**Decision:** Punt to v2; desk-only for v1 (option B).

Award tickets are ~12% of in-window changes — acceptable trade for shipping 2 weeks earlier. Flag the gate behind \`feature.award_self_serve\` so v2 can enable in place.

## Q4 — Quota on cancel-and-rebook
**Decision:** Free retry within 10 minutes (option A).

Matches industry norm. Loyalty team committed to monitoring for abuse via daily report.

---
*4 of 4 ambiguities resolved. Spec is ready for plan.*
`,
  },
  "plan.md": {
    size: "6.3 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T15:02Z
---

# Architecture plan

## Sequence
1. Mobile app POSTs to \`/itineraries/:id/change\` with desired flight.
2. \`itinerary-service\` calls \`rebook-rules\` gRPC v3 for eligibility (<200ms p95).
3. On eligible: supplier API call, then atomic write to itinerary + ledger.
4. Push receipt via FCM and email worker.

## Components
- **Eligibility gateway** (new) — sits in front of rebook-rules, caches the 60s window.
- **Atomic rollback** — saga pattern; compensating writes on supplier failure.
- **Receipt fan-out** — existing notification-worker, new template id \`change-confirm-v1\`.

## Non-functional
- p95 < 1.5s end-to-end for the rebook-search endpoint.
- < 0.5% guest-facing failure budget.
- Cache pre-warm during ops-flagged weather events.

## Rollout
Behind \`feature.self_serve_flight_change\`. 1% → 10% → 50% → 100% with 24h hold at each step.

## Risks
- Supplier throttling during weather spikes. Mitigation: pre-warm + circuit breaker.
- Loyalty-ledger throughput unproven > 80 ev/s. Mitigation: load-test gate before 10%.
`,
  },
  "research.md": {
    size: "3.2 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T15:01Z
---

# Research

## Supplier API surface
- 4 active supplier integrations: SkyOne (REST), AirNexus (gRPC), VoyageDirect (SOAP), LegacyAir (REST + XML).
- Average rebook latency: 380ms (SkyOne) to 2.1s (LegacyAir, p95).
- LegacyAir requires day-of-departure surcharge calculation — confirm with finance.

## Prior incidents
- **INC-2024-08-11:** rebook-rules cache stampede during hurricane window. Cause: thundering herd on cold cache.
- **INC-2025-02-03:** ledger append lag exceeded 60s. Cause: undersized partition count.

## Loyalty-ledger benchmarks
- Last load test: 80 ev/s sustained (2025-Q4). Above that, append lag grew superlinearly.
- We need 120 ev/s headroom for the projected change volume.

## Competitor scan
- Delta SkyMiles: 24h window, owner-only changes.
- United MileagePlus: 48h window, owner + companion, point refunds.
- We're matching the most generous tier.
`,
  },
  "data-model.md": {
    size: "2.0 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T15:00Z
---

# Data model

## Entity: \`FlightChangeRequest\`
| Field             | Type        | Notes                                            |
|-------------------|-------------|--------------------------------------------------|
| id                | uuid        | primary key                                      |
| itinerary_id      | uuid        | fk to itineraries                                |
| requested_by      | uuid        | fk to guests                                     |
| original_flight   | flight_ref  | snapshot at request time                         |
| new_flight        | flight_ref  | selected alternative                             |
| companions        | [uuid]      | included travelers, post opt-out                 |
| state             | enum        | draft → eligible → confirmed → completed         |
| fare_delta_cents  | int         | signed; negative = credit owed                   |
| created_at        | timestamp   |                                                  |
| committed_at      | timestamp   | nullable until confirmed                         |

## Invariants
- A \`FlightChangeRequest\` may only transition forward.
- \`committed_at\` is set atomically with itinerary update and ledger append.
- On rollback, the row stays in \`draft\` with a failure reason attached.

## Indexes
- \`(itinerary_id, state)\` for active-change lookup.
- \`(requested_by, created_at desc)\` for guest-app history.
`,
  },
  "contracts/rebook.proto": {
    size: "1.1 KB",
    kind: "code",
    content: `syntax = "proto3";

package collette.rebook.v3;

service RebookRules {
  rpc CheckEligibility(EligibilityRequest) returns (EligibilityResponse);
  rpc ListAlternatives(AlternativesRequest) returns (AlternativesResponse);
}

message EligibilityRequest {
  string itinerary_id = 1;
  string requested_by_guest_id = 2;
  google.protobuf.Timestamp now = 3;
}

message EligibilityResponse {
  bool eligible = 1;
  string reason = 2;             // empty if eligible
  int32 remaining_changes = 3;
  bool award_ticket = 4;          // gated to v2
}

message AlternativesRequest {
  string itinerary_id = 1;
  google.protobuf.Timestamp earliest = 2;
  google.protobuf.Timestamp latest = 3;
}

message Alternative {
  string flight_id = 1;
  int32 fare_delta_cents = 2;
  int32 minutes_delta = 3;
}

message AlternativesResponse {
  repeated Alternative alternatives = 1;
}
`,
  },
  "analysis.md": {
    size: "2.4 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T15:14Z
---

# Cross-check analysis

Comparing spec.md, clarifications.md, and plan.md for coverage and contradiction.

## Coverage
- ✅ All 5 acceptance criteria mapped to plan.md sections.
- ✅ All 4 clarifications reflected in architecture and rollout.
- ✅ Dependencies enumerated match the actual service contracts.

## Findings

### Medium — auto-resolved
1. **Spec mentions guest-app push, plan describes FCM + email.** Plan is more complete; spec updated to match.
2. **Ledger throughput risk not surfaced in spec's "Open risks".** Added.

### Low — informational
- "Award-ticket gate" appears as a non-goal AND as a feature flag. Both correct; flag is for forward-compat.

## Blockers
**None.** Spec is internally consistent and ready for task generation.
`,
  },
  "tasks.md": {
    size: "2.9 KB",
    kind: "markdown",
    content: `---
spec: 0042-self-serve-flight-change
generated: 2026-05-19T15:30Z
---

# Tasks

12 atomic, testable units. Total estimate: 22 days. Dependency arrows in parentheses.

## Frontend (8d)
- **T-01** Add flight-change entry point to itinerary screen — 2d
- **T-02** Build alternatives list view with fare-diff sort — 3d (← T-05)
- **T-03** Companion-traveler opt-out confirm modal — 1d
- **T-04** Receipt screen + push-notification deep link — 1d (← T-05, T-07)

## Backend (10d)
- **T-05** New endpoint POST /itineraries/:id/change — 2d
- **T-06** Eligibility gateway calling rebook-rules v3 — 2d (← T-05)
- **T-07** Atomic rollback handler across itinerary + ledger writes — 3d
- **T-08** Award-ticket eligibility gate (feature-flagged off) — 1d
- **T-10** Supplier rate-limit / circuit-breaker around weather spikes — 2d

## Data / DB (2d)
- **T-09** Loyalty-ledger append throughput load test ≥120 ev/s — 2d

## QA (3d)
- **T-11** E2E test matrix — 6 tiers × 4 fare deltas — 2d (← T-04)
- **T-12** Chaos test: failed write rollback parity — 1d (← T-07)

---
Parallelizable groups: {T-01, T-05, T-07, T-09, T-10} can start day 1.
`,
  },
};

// Expanded task details for the task viewer
const TASK_DETAILS = {
  "T-01": {
    desc: "Add a 'Change flight' affordance to the itinerary screen. Visible only for loyalty-tier guests within the ±48h window.",
    files: ["mobile/src/screens/Itinerary.tsx", "mobile/src/components/EntryRow.tsx"],
    acceptance: [
      "Entry point renders for Gold + Platinum guests only",
      "Hidden when no eligible flights are within window",
      "Tap target ≥ 44pt; matches design system spec 0042-fe-01",
    ],
    blocks: [],
  },
  "T-02": {
    desc: "Alternatives list view sorted by fare difference, then departure delta. Pull-to-refresh; empty state when none available.",
    files: ["mobile/src/screens/Alternatives.tsx", "mobile/src/components/FareDiffPill.tsx"],
    acceptance: [
      "List renders ≤ 200ms after eligibility response",
      "Sort: fare-diff ASC, then |minutes-delta| ASC",
      "Empty state explains why (no inventory, ineligible, etc.)",
    ],
    blocks: ["T-05"],
  },
  "T-03": {
    desc: "Modal shown when changing a Platinum-tier PNR with companions. Each companion has a per-leg opt-out toggle (default: included).",
    files: ["mobile/src/components/CompanionOptOutModal.tsx"],
    acceptance: [
      "All companions opt-in by default",
      "Confirm disabled if any flight has 0 confirmed travelers",
      "Selection persists across modal re-opens within a single change request",
    ],
    blocks: [],
  },
  "T-04": {
    desc: "Receipt screen rendered after a successful change. Deep link target for the FCM push and email CTA.",
    files: ["mobile/src/screens/ChangeReceipt.tsx", "mobile/src/navigation/deepLinks.ts"],
    acceptance: [
      "Renders within 30s of confirm",
      "Deep link recovers state on cold start",
      "Receipt is downloadable as PDF",
    ],
    blocks: ["T-05", "T-07"],
  },
  "T-05": {
    desc: "New endpoint POST /itineraries/:id/change. Validates ownership, dispatches to eligibility + supplier, returns 202 with change_id.",
    files: ["services/itinerary/handlers/change.go", "services/itinerary/openapi.yaml"],
    acceptance: [
      "p95 latency < 200ms for the synchronous portion",
      "OpenAPI v2 updated and published to dev portal",
      "Auth: must be itinerary owner or linked companion-organizer",
    ],
    blocks: [],
  },
  "T-06": {
    desc: "Eligibility gateway: front-door for rebook-rules v3 gRPC, with a 60s in-window cache.",
    files: ["services/itinerary/eligibility/gateway.go", "services/itinerary/eligibility/cache.go"],
    acceptance: [
      "Cache hit ratio ≥ 70% during steady-state",
      "Stampede protection: single-flight per itinerary key",
      "Falls open on rebook-rules unavailability (returns reason: 'unavailable')",
    ],
    blocks: ["T-05"],
  },
  "T-07": {
    desc: "Saga-pattern rollback. Compensating writes on itinerary + loyalty-ledger if supplier confirm fails after primary write.",
    files: ["services/itinerary/saga/changeflight.go", "services/itinerary/saga/compensate.go"],
    acceptance: [
      "All-or-nothing: zero partial commits in 10k chaos runs",
      "Rollback completes within 5s of supplier-fail signal",
      "Audit trail captures every step",
    ],
    blocks: [],
  },
  "T-08": {
    desc: "Award-ticket flag plumbing. Default OFF; when toggled, route requests through award-eligibility branch.",
    files: ["services/itinerary/flags/awardgate.go"],
    acceptance: [
      "Flag default = false in all envs",
      "When false: award-ticket requests return reason: 'desk_only'",
      "When true: route to award-eligibility (stub for v2)",
    ],
    blocks: [],
  },
  "T-09": {
    desc: "Loyalty-ledger append throughput load test. Establish 120 ev/s sustained capacity before 10% rollout.",
    files: ["loyalty-ledger/loadtest/throughput.k6.js"],
    acceptance: [
      "≥ 120 ev/s sustained for 30 min",
      "Append lag p99 < 2s under sustained load",
      "Report committed to docs/load-tests/0042.md",
    ],
    blocks: [],
  },
  "T-10": {
    desc: "Per-supplier circuit breaker, with weather-event override that pre-loads cache + tightens limits.",
    files: ["services/itinerary/supplier/breaker.go"],
    acceptance: [
      "Breaker trips at 5 consecutive failures within 30s",
      "Weather mode (ops-toggled) halves the trip threshold",
      "Cooldown: 60s; half-open probe at 30s",
    ],
    blocks: [],
  },
  "T-11": {
    desc: "End-to-end test matrix: 6 loyalty tiers × 4 fare-delta buckets. Runs against the dev environment in CI.",
    files: ["qa/e2e/flightchange.spec.ts"],
    acceptance: [
      "Matrix runs on every PR touching itinerary or rebook code",
      "Flaky tests retried up to 3× before report",
      "Run time ≤ 12 min for full matrix",
    ],
    blocks: ["T-04"],
  },
  "T-12": {
    desc: "Chaos test: inject supplier-confirm failures and assert rollback parity (itinerary + ledger fully reverted).",
    files: ["qa/chaos/rollback.spec.ts"],
    acceptance: [
      "10k runs; zero partial-commit observations",
      "Compensating writes complete within SLA in 99.9% of runs",
      "Report committed to docs/chaos/0042.md",
    ],
    blocks: ["T-07"],
  },
};

Object.assign(window, {
  REPOS, SAMPLE_PROMPT, SPEC_MD, CLARIFY_QUESTIONS, TASKS, INITIAL_LOG, COPILOT_MODELS, BRANCHES, EVIDENCE_FILES, TASK_DETAILS,
});
