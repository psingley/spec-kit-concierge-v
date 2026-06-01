// Parses the spec-kit /speckit.clarify agent's ACTUAL emitted message format
// (see .github/agents/speckit.clarify.agent.md) into the ClarifySummary question
// shape consumed by the renderer. The agent poses ONE question per turn but may, in
// practice, emit several; this parser handles one-or-more questions per message.
//
// Multiple-choice question shape:
//   **Recommended:** Option A - <reasoning>
//   <question text>
//   | Option | Description |            (or | Option | Answer | Implications |)
//   |--------|-------------|
//   | A | <desc> |
//   | B | <desc> |
//   | Short | Provide a different short answer (<=5 words) |   <- free-form, dropped
//
// Short-answer question shape (no >=2-option table):
//   **Suggested:** <answer> - <reasoning>
//   <question text>
//   Format: Short answer (<=5 words). ...

export type ParsedClarifyQuestion = {
  id: string;
  position: number;
  text: string;
  choices: Array<{ key: string; label: string }>;
  recommendedKey?: string;
  shortAnswer?: boolean;
  suggestion?: string;
};

export type ParsedMalformedClarifyQuestion = {
  id: string;
  position: number;
  malformationCategory: string;
  rawOutput: string;
};

export type ParsedClarifyMessage = {
  questions: ParsedClarifyQuestion[];
  malformedQuestions: ParsedMalformedClarifyQuestion[];
};

const isTableRow = (line: string): boolean => /^\s*\|.*\|\s*$/.test(line);
const isTableSeparator = (line: string): boolean => /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');

const splitRowCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const stripMarkdown = (value: string): string => value.replace(/\*\*/g, '').replace(/`/g, '').trim();

const recommendedKeyFromLine = (line: string): string | undefined => {
  const match = /(?:Recommended|Suggested)\s*:\s*Option\s+([A-Za-z0-9]+)/i.exec(stripMarkdown(line));
  return match?.[1];
};

const suggestionFromLine = (line: string): string | undefined => {
  const match = /Suggested\s*:\s*(.+)$/i.exec(stripMarkdown(line));
  if (match === undefined || match === null) {
    return undefined;
  }
  // Drop the trailing " - <reasoning>" if present.
  return match[1]!.split(/\s+-\s+/)[0]!.trim();
};

// A segment is a contiguous run of lines that ends at (and includes) a table, or
// that contains a short-answer Format marker. We split on table boundaries so each
// question owns the prose that precedes its table.
type Segment = { lines: string[] };

const segmentMessage = (message: string): Segment[] => {
  const lines = message.split(/\r?\n/);
  const segments: Segment[] = [];
  let current: string[] = [];
  let inTable = false;

  const flush = (): void => {
    if (current.some((line) => line.trim().length > 0)) {
      segments.push({ lines: current });
    }
    current = [];
  };

  for (const line of lines) {
    const rowLike = isTableRow(line);
    if (rowLike) {
      inTable = true;
      current.push(line);
      continue;
    }
    if (inTable && !rowLike) {
      // Table just ended -> close this segment, start a fresh one.
      inTable = false;
      flush();
      current.push(line);
      continue;
    }
    current.push(line);
  }
  flush();
  return segments;
};

// A prose line is eligible to hold question text unless it is a table row or
// separator. The agent's chatter / label boilerplate is stripped *within* the
// line by stripQuestionChatter (see below) rather than rejected wholesale, so
// that a line mixing chatter + the real question still yields the question.
const isQuestionTextLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (isTableRow(trimmed) || isTableSeparator(trimmed)) {
    return false;
  }
  return true;
};

// Removes known agent boilerplate from within a prose line, leaving the real
// question text. The agent sometimes jams an instruction sentence and/or a bold
// label onto the same line as the question, e.g.
//   You can reply with the option letter.**Clarification 1:** When ... authoritative?
// A line that is purely chatter strips to ''.
const stripQuestionChatter = (line: string): string => {
  let result = line.trim();

  // 1) Strip a leading known instruction sentence (up to and including its
  //    terminating period). Only these specific boilerplate prefixes.
  const instructionPrefix =
    /^(?:You can reply\b[^.]*\.|You can accept\b[^.]*\.|Reply with\b[^.]*\.|Format\s*:\s*Short answer\b[^.]*\.)\s*/i;
  while (instructionPrefix.test(result)) {
    result = result.replace(instructionPrefix, '').trim();
  }

  // 2) Strip a leading bold/plain label such as **Clarification 1:** /
  //    **Clarification:** / **Recommended:** / **Suggested:** when it prefixes
  //    the question text.
  const labelPrefix =
    /^(?:\*\*)?\s*(?:Clarification(?:\s+\d+)?|Recommended|Suggested)\s*:\s*(?:\*\*)?\s*/i;
  result = result.replace(labelPrefix, '').trim();

  // 3) Strip remaining markdown emphasis and trim.
  return stripMarkdown(result);
};

const extractQuestionText = (proseLines: string[]): string => {
  // Strip chatter from each eligible prose line first, dropping any line that
  // strips to empty (pure chatter / a bare Recommended|Suggested label). Then
  // prefer the last line ending in '?' (the actual question); fall back to the
  // last non-empty stripped line otherwise.
  const candidates = proseLines.filter(isQuestionTextLine).map(stripQuestionChatter).filter((line) => line.length > 0);
  if (candidates.length === 0) {
    return '';
  }
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    if (candidates[i]!.endsWith('?')) {
      return candidates[i]!;
    }
  }
  return candidates[candidates.length - 1]!;
};

const parseChoices = (segment: Segment): Array<{ key: string; label: string }> => {
  const rows = segment.lines.filter((line) => isTableRow(line) && !isTableSeparator(line));
  const choices: Array<{ key: string; label: string }> = [];
  for (const row of rows) {
    const cells = splitRowCells(row);
    if (cells.length < 2) {
      continue;
    }
    const key = stripMarkdown(cells[0]!);
    const label = stripMarkdown(cells[1]!);
    // Skip the header row and the free-form "Short" alternative row.
    if (/^option$/i.test(key) || key.length === 0) {
      continue;
    }
    if (/^short$/i.test(key)) {
      continue;
    }
    if (label.length === 0) {
      continue;
    }
    choices.push({ key, label });
  }
  return choices;
};

export const parseClarifyTableMessage = (message: string): ParsedClarifyMessage => {
  const segments = segmentMessage(message);
  const questions: ParsedClarifyQuestion[] = [];
  const malformedQuestions: ParsedMalformedClarifyQuestion[] = [];
  let position = 0;

  for (const segment of segments) {
    const hasTable = segment.lines.some(isTableRow);
    const isShortAnswer = segment.lines.some((line) => /^Format\s*:/i.test(line.trim()));

    if (!hasTable && !isShortAnswer) {
      continue;
    }

    const text = extractQuestionText(segment.lines);

    if (hasTable) {
      const choices = parseChoices(segment);
      position += 1;
      const id = `q${position}`;
      if (choices.length < 2 || text.length === 0) {
        malformedQuestions.push({
          id,
          position,
          malformationCategory: choices.length < 2 ? 'choices-missing' : 'empty-question-text',
          rawOutput: segment.lines.join('\n').trim()
        });
        continue;
      }
      const recommendedLine = segment.lines.find((line) => /Recommended\s*:/i.test(line));
      questions.push({
        id,
        position,
        text,
        choices,
        recommendedKey: recommendedLine !== undefined ? recommendedKeyFromLine(recommendedLine) : undefined
      });
      continue;
    }

    // short-answer
    position += 1;
    const id = `q${position}`;
    if (text.length === 0) {
      malformedQuestions.push({ id, position, malformationCategory: 'empty-question-text', rawOutput: segment.lines.join('\n').trim() });
      continue;
    }
    const suggestionLine = segment.lines.find((line) => /Suggested\s*:/i.test(line));
    questions.push({
      id,
      position,
      text,
      choices: [],
      shortAnswer: true,
      suggestion: suggestionLine !== undefined ? suggestionFromLine(suggestionLine) : undefined
    });
  }

  return { questions, malformedQuestions };
};
