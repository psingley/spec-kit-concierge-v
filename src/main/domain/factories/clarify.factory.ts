import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, factoryEscape, readRequiredArtifact } from './factoryUtils';
import type { ClarifyQuestion, MalformedClarifyQuestion, StepContractContext, StepContractResult } from './types';

const emitMalformed = (
  malformed: MalformedClarifyQuestion,
  context: StepContractContext
): void => {
  context.logger?.warn?.(
    {
      questionId: malformed.id,
      position: malformed.position,
      malformationCategory: malformed.malformationCategory,
      rawOutput: malformed.rawOutput,
      timestamp: (context.now?.() ?? new Date()).toISOString(),
      modelId: context.modelId ?? 'unknown'
    },
    'clarify question malformed'
  );
};

const parseQuestion = (block: string, index: number): ClarifyQuestion | MalformedClarifyQuestion => {
  const id = `q${index + 1}`;
  const position = index + 1;
  if (/^(\*\*|__)/m.test(block)) {
    return { id, position, malformationCategory: 'parser-breaking-emphasis', rawOutput: block };
  }
  if (block.includes('\r\n') && block.includes('\n') && !/\r\n/.test(block.replace(/\r\n/g, ''))) {
    return { id, position, malformationCategory: 'mixed-line-endings', rawOutput: block };
  }
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const unexpectedKey = lines.find((line) => /^[A-Za-z0-9_-]+\s*:/.test(line) && !line.startsWith('Q:'));
  if (unexpectedKey !== undefined) {
    return { id, position, malformationCategory: 'unexpected-key', rawOutput: block };
  }
  const questionLine = lines.find((line) => line.startsWith('Q:'));
  if (questionLine === undefined || questionLine.slice(2).trim().length === 0) {
    return { id, position, malformationCategory: 'empty-question-text', rawOutput: block };
  }
  const choices = lines
    .filter((line) => /^-\s*[A-Za-z0-9]+\s*:/.test(line))
    .map((line) => {
      const match = /^-\s*([A-Za-z0-9]+)\s*:\s*(.+)$/.exec(line);
      return { key: match?.[1] ?? '', label: match?.[2] ?? '' };
    });
  if (choices.length < 2 || choices.some((choice) => choice.key.length === 0 || choice.label.length === 0)) {
    return { id, position, malformationCategory: 'choices-missing', rawOutput: block };
  }

  return { id, position, text: questionLine.slice(2).trim(), choices };
};

const hasHostileFrontmatter = (rawText: string): boolean => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(rawText);
  if (match === null) {
    return false;
  }

  return (match[1] ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => /^[A-Za-z0-9_-]+\s*:/.test(line));
};

const extractClarificationBody = (rawText: string): string => {
  const marker = /^## Clarifications\s*$/m.exec(rawText);
  if (marker === null) {
    return rawText;
  }

  const afterMarker = rawText.slice(marker.index + marker[0].length);
  const nextSection = /\n##\s+/.exec(afterMarker);
  return nextSection === null ? afterMarker : afterMarker.slice(0, nextSection.index);
};

export const validateClarifyArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const rawText = await readRequiredArtifact(featureDir, 'spec.md');
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return factoryEscape();
  }
  if (hasHostileFrontmatter(rawText) || /MALFORMED/i.test(rawText)) {
    return factoryEscape();
  }
  if (rawText.trim() === 'no questions needed') {
    return { ok: true, commit: commitCandidate('clarify', [...STEP_ARTIFACT_MANIFEST.clarify.requiredFiles], context) };
  }

  const clarificationBody = extractClarificationBody(rawText);
  const blocks = clarificationBody
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .filter((block) => /^Q:/m.test(block) || /^[A-Za-z0-9_-]+\s*:/m.test(block));
  if (blocks.length === 0) {
    return factoryEscape();
  }
  const wellFormedQuestions: ClarifyQuestion[] = [];
  const malformedQuestions: MalformedClarifyQuestion[] = [];

  for (const [index, block] of blocks.entries()) {
    const parsed = parseQuestion(block, index);
    if ('malformationCategory' in parsed) {
      malformedQuestions.push(parsed);
      emitMalformed(parsed, context);
    } else {
      wellFormedQuestions.push(parsed);
    }
  }

  if (malformedQuestions.length > 0) {
    return { ok: false, kind: 'malformed-questions', wellFormedQuestions, malformedQuestions, rawText };
  }

  return { ok: true, commit: commitCandidate('clarify', [...STEP_ARTIFACT_MANIFEST.clarify.requiredFiles], context), questions: wellFormedQuestions };
};
