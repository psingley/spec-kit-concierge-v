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

Object.assign(window, {
  REPOS, SAMPLE_PROMPT, SPEC_MD, CLARIFY_QUESTIONS, TASKS, INITIAL_LOG, COPILOT_MODELS, BRANCHES,
});
