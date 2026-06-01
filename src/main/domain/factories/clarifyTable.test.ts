import { describe, expect, it } from 'vitest';
import { parseClarifyTableMessage } from './clarifyTable';

describe('parseClarifyTableMessage', () => {
  it('parses a single multiple-choice question with a Recommended line and an option table', () => {
    const message = `Here is the first clarification.

**Recommended:** Option A - lowest risk and matches existing rebook contracts.

When the new fare is lower than the original, how should the difference be handled?

| Option | Description |
|--------|-------------|
| A | Refund the difference to original payment method |
| B | Issue future-travel credit at face value |
| C | Hold credit at the original fare; no refund |
| Short | Provide a different short answer (<=5 words) |

You can reply with the option letter (e.g., "A"), accept the recommendation by saying "yes" or "recommended", or provide your own short answer.`;

    const result = parseClarifyTableMessage(message);

    expect(result.questions).toHaveLength(1);
    const question = result.questions[0]!;
    expect(question.id).toBe('q1');
    expect(question.position).toBe(1);
    expect(question.text).toBe('When the new fare is lower than the original, how should the difference be handled?');
    expect(question.choices).toEqual([
      { key: 'A', label: 'Refund the difference to original payment method' },
      { key: 'B', label: 'Issue future-travel credit at face value' },
      { key: 'C', label: 'Hold credit at the original fare; no refund' }
    ]);
    expect(question.recommendedKey).toBe('A');
    expect(result.malformedQuestions).toHaveLength(0);
  });

  it('parses the Option | Answer | Implications three-column table shape', () => {
    const message = `**Recommended:** Option B - balances coverage and effort.

Which policy owns award-ticket eligibility?

| Option | Answer | Implications |
|--------|--------|--------------|
| A | loyalty-ledger | central audit |
| B | rebook-rules | colocated with fare logic |
`;

    const result = parseClarifyTableMessage(message);

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]!.choices).toEqual([
      { key: 'A', label: 'loyalty-ledger' },
      { key: 'B', label: 'rebook-rules' }
    ]);
    expect(result.questions[0]!.recommendedKey).toBe('B');
  });

  it('parses a short-answer question (Suggested + Format) into a question with no choices', () => {
    const message = `**Suggested:** 80 events/sec - matches current ledger ceiling.

What is the target sustained write throughput for the loyalty ledger?

Format: Short answer (<=5 words). You can accept the suggestion by saying "yes" or "suggested", or provide your own answer.`;

    const result = parseClarifyTableMessage(message);

    expect(result.questions).toHaveLength(1);
    const question = result.questions[0]!;
    expect(question.id).toBe('q1');
    expect(question.text).toBe('What is the target sustained write throughput for the loyalty ledger?');
    expect(question.choices).toEqual([]);
    expect(question.shortAnswer).toBe(true);
    expect(question.suggestion).toBe('80 events/sec');
    expect(result.malformedQuestions).toHaveLength(0);
  });

  it('parses multiple multiple-choice questions in one message', () => {
    const message = `**Recommended:** Option A

When the new fare is lower than the original, how should the difference be handled?

| Option | Description |
|--------|-------------|
| A | Refund |
| B | Credit |

**Recommended:** Option C

For companion travelers on a Platinum-tier booking, should the change apply to everyone on the PNR or only the booking owner?

| Option | Description |
|--------|-------------|
| A | Always all travelers |
| B | Default all, opt-out per leg |
| C | Owner only |
`;

    const result = parseClarifyTableMessage(message);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]!.id).toBe('q1');
    expect(result.questions[0]!.position).toBe(1);
    expect(result.questions[1]!.id).toBe('q2');
    expect(result.questions[1]!.position).toBe(2);
    expect(result.questions[1]!.recommendedKey).toBe('C');
    expect(result.questions[1]!.choices).toHaveLength(3);
  });

  it('reports a malformed question when a table has fewer than two options', () => {
    const message = `Pick a backend.

| Option | Description |
|--------|-------------|
| A | only one option |
`;

    const result = parseClarifyTableMessage(message);

    expect(result.questions).toHaveLength(0);
    expect(result.malformedQuestions).toHaveLength(1);
    expect(result.malformedQuestions[0]!.id).toBe('q1');
    expect(result.malformedQuestions[0]!.malformationCategory).toBe('choices-missing');
    expect(result.malformedQuestions[0]!.rawOutput).toContain('only one option');
  });

  it('returns no questions for a message with no tables and no short-answer markers', () => {
    const result = parseClarifyTableMessage('No critical ambiguities remain. Clarification complete.');
    expect(result.questions).toHaveLength(0);
    expect(result.malformedQuestions).toHaveLength(0);
  });
});
