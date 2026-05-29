# Contract: Clarify API and Stream

## IPC Capability

### `copilot:clarify`

Starts or continues the Clarify step.

Request:

```ts
{
  subscriptionId: string;
  repositoryPath: string;
  branch: string;
  sessionId?: string;
  mode: 'next' | 'askAnother' | 'reaskMalformed' | 'commit';
  questionId?: string;
  answers?: Array<{ questionId: string; choiceKey: string; note?: string }>;
  reaskContext?: {
    malformedQuestionText: string;
    position: number;
    malformationCategory: string;
    wellFormedQuestions: Array<{ id: string; text: string }>;
  };
  modelId?: string;
}
```

Ack:

```ts
{
  subscriptionId: string;
  sessionId: string;
  step: 'clarify';
  accepted: true;
}
```

## Stream Transport

Transport event: `copilot:clarify:event`

Envelope:

```ts
{
  subscriptionId: string;
  event: StepStreamEvent;
}
```

Progress event uses ADR-0010 unchanged.

Done pass:

```ts
{
  type: 'done';
  step: 'clarify';
  sessionId: string;
  status: 'pass';
  artifactPath: string;
  commitSha: string;
  summary: {
    questions: Array<{ id: string; text: string; choices: Array<{ key: string; label: string }> }>;
    answers: Array<{ questionId: string; choiceKey: string; note?: string }>;
  };
}
```

Done fail:

```ts
{
  type: 'done';
  step: 'clarify';
  sessionId: string;
  status: 'fail';
  reason: string;
}
```

The main handler enforces exactly one terminal `done`.

## Renderer API Operations

- `clarify:next`: request initial Clarify questions.
- `clarify:answer`: store/update selected choice and textarea note locally in session state.
- `clarify:reaskMalformed`: dispatch targeted same-session rewrite for one malformed card.
- `clarify:askAnother`: request one additional question in the same ACP session.
- `clarify:commit`: write accepted answers in-place to `spec.md`, validate, run after hook, and return Step Commit proof.

## Error Rules

- Reject missing `subscriptionId`, `repositoryPath`, `branch`, mode, or required mode-specific fields.
- Reject renderer payloads with extra keys.
- Reject `done/pass` without `artifactPath`, `commitSha`, or summary.
- Reject duplicate terminal emissions in main tests.
