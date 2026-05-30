# Contract: Review and Passive Visual Fixtures

## Review fixtures

The visual-diff harness must drive the real shipped Review component path for these states:

| Screen | Required state |
|--------|----------------|
| `review-unavailable` | Review opened before Analyze pass trailer; normal journey shows unavailable/idle treatment. |
| `review-partial-evidence` | Developer fixture with some proof/artifacts and non-blocking warnings. |
| `review-populated` | Completed prior steps, trailer proof, required/optional artifacts, clarifications, Analyze report, and tasks. |
| `review-readonly-bounce` | Completed non-Review step view-only treatment with Resume affordance visible. |
| `review-resume-target` | Resume targets running step first, otherwise first incomplete canonical step. |
| `review-selected-evidence` | Evidence body loaded only after selection. |
| `review-evidence-read-failure` | Selected body read failure shown while summary remains visible. |
| `review-task-modal` | Task list opens per-task detail modal using parsed task data. |

## Passive fixtures

The passive visual-diff fixtures for Plan, Tasks, and Analyze must stop injecting synthetic `main.innerHTML` passive markup and instead reach shipped state through the app/component path that renders `PassiveStepContainer`, `PassiveStep`, and `StatusStep`.

Required passive states:

- `plan-passive-idle`
- `plan-passive-running`
- `plan-passive-done`
- `tasks-passive-idle`
- `tasks-passive-running`
- `tasks-passive-done`
- `analyze-passive-idle`
- `analyze-passive-running`
- `analyze-passive-done`
- `passive-artifact-modal`

## Assertions

Passive fixtures must assert the real UI exposes:

- status count text or equivalent accessible summary
- running/complete/warning tag state
- artifact evidence subtitles distinguishing required, optional, remediation, and app-owned report evidence
- artifact action enabled/disabled state
- passive silence notice copy when the 40-minute no-recent-output state is simulated

Review fixtures must assert:

- no Review commit/proof row is rendered
- optional Plan evidence is labeled optional
- Analyze empty-pass/no-diff state is understandable
- evidence body text is absent before selection
- task modal is keyboard reachable and has dialog semantics
