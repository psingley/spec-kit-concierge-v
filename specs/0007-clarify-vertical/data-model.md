# Data Model: Run 7 Clarify Vertical

## ClarifyQuestion

- `id`: stable question id, unique within the Clarify session.
- `position`: one-based display position for prompts, audit records, and UI labels; internal arrays/selectors may still use zero-based indexes.
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

- `questions`: ordered Clarify questions managed with Redux Toolkit `createEntityAdapter` because question ids are stable.
- `answers`: Clarify answers managed with Redux Toolkit `createEntityAdapter`, using `questionId` as the stable entity id.
- `activeQuestionId`: selected question for display/navigation.
- `askAnother`: idle/in-flight/error state.
- `reask`: rewrite records managed with Redux Toolkit `createEntityAdapter`, using malformed `questionId` as the stable entity id and referencing the adapter-managed question collection.
- `completion`: idle/in-flight/pass/fail state plus `artifactPath`, `commitSha`, and summary on pass.

## MalformedQuestionRecord

- `questionId`: stable id assigned by the factory.
- `position`: original one-based display position.
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
