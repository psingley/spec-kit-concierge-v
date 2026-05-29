# Data Model: Run 7 Clarify Vertical

## ClarifyQuestion

- `id`: stable question id, unique within the Clarify session.
- `position`: zero-based or one-based display position, stable through rewrite for unaffected questions.
- `text`: trimmed non-empty question text.
- `choices`: at least two `ClarifyChoice` records.
- `status`: `well_formed`, `malformed`, `rewriting`, or `resolved`.
- `malformation`: optional `MalformedQuestionRecord`.

## ClarifyChoice

- `key`: non-empty display key such as `A`.
- `label`: non-empty answer label.
- `questionId`: owning question id.

## ClarifyAnswer

- `questionId`: stable question id.
- `choiceKey`: selected choice key.
- `note`: optional short-answer textarea text supplied by the renderer.
- `updatedAt`: ISO timestamp for local UI ordering and audit readability.

## ClarifySessionState

Lives under the existing `session` slice.

- `questions`: ordered Clarify questions.
- `answers`: record keyed by `questionId`.
- `activeQuestionId`: selected question for display/navigation.
- `askAnother`: idle/in-flight/error state.
- `reask`: record keyed by malformed question id with attempt count and in-flight state.
- `completion`: idle/in-flight/pass/fail state plus `artifactPath`, `commitSha`, and summary on pass.

## MalformedQuestionRecord

- `questionId`: stable id assigned by the factory.
- `position`: original position.
- `malformationCategory`: strict category such as `empty-question-text`, `choices-missing`, `parser-breaking-emphasis`, `mixed-line-endings`, `duplicate-question-id`, or `extra-data`.
- `rawOutput`: safe raw block or safe excerpt.
- `attempts`: actual rewrite attempts already made.
- `inFlight`: whether the card is currently being rewritten.

## MalformationAuditEntry

Written as one JSON line to `userData/clarify-malformations.jsonl`.

- `sessionId`
- `step`: always `clarify`
- `questionId`
- `malformationCategory`
- `rawOutput` or `rawExcerpt`
- `timestamp`
- `modelId`

Audit entries must avoid secrets and unrelated personal data.

## ClarifyCompletionSummary

Carried by `copilot:clarify` `done/pass`.

- `questions`: parsed question ids/text/choices.
- `answers`: selected choice and optional note per question id.
- `artifactPath`: path to feature `spec.md`.
- `commitSha`: Step Commit SHA for `Concierge-Step: clarify:pass`.
