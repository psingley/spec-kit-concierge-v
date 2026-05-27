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
  if (/^(\*\*|__)/m.test(block)) {
    return { id, malformationCategory: 'parser-breaking-emphasis', rawOutput: block };
  }
  if (block.includes('\r\n') && block.includes('\n') && !/\r\n/.test(block.replace(/\r\n/g, ''))) {
    return { id, malformationCategory: 'mixed-line-endings', rawOutput: block };
  }
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const questionLine = lines.find((line) => line.startsWith('Q:'));
  if (questionLine === undefined || questionLine.slice(2).trim().length === 0) {
    return { id, malformationCategory: 'empty-question-text', rawOutput: block };
  }
  const choices = lines
    .filter((line) => /^-\s*[A-Za-z0-9]+\s*:/.test(line))
    .map((line) => {
      const match = /^-\s*([A-Za-z0-9]+)\s*:\s*(.+)$/.exec(line);
      return { key: match?.[1] ?? '', label: match?.[2] ?? '' };
    });
  const allowShortAnswer = lines.some((line) => /short answer/i.test(line));
  if (choices.length < 2 || choices.some((choice) => choice.key.length === 0 || choice.label.length === 0)) {
    return { id, malformationCategory: 'choices-missing', rawOutput: block };
  }
  if (!allowShortAnswer) {
    return { id, malformationCategory: 'short-answer-missing', rawOutput: block };
  }

  return { id, text: questionLine.slice(2).trim(), choices, allowShortAnswer };
};

export const validateClarifyArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const rawText = await readRequiredArtifact(featureDir, 'clarifications.md');
  if (rawText === undefined || rawText.trim().length === 0) {
    return factoryEscape();
  }
  if (/^---\r?\n[\s\S]*?\r?\n---/.test(rawText) || /MALFORMED/i.test(rawText)) {
    return factoryEscape();
  }
  if (/no questions needed/i.test(rawText)) {
    return { ok: true, commit: commitCandidate('clarify', [...STEP_ARTIFACT_MANIFEST.clarify.requiredFiles], context) };
  }

  const blocks = rawText.split(/\n\s*\n/).filter((block) => block.trim().length > 0);
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

  return { ok: true, commit: commitCandidate('clarify', [...STEP_ARTIFACT_MANIFEST.clarify.requiredFiles], context) };
};
