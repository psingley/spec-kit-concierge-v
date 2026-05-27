import type { MainLogger } from '../../logging';

export type TrailerInterpretation = 'exact' | 'normalized' | 'partial';

export type ConciergeStepTrailer =
  | {
      found: false;
      warnings: string[];
    }
  | {
      found: true;
      step: string;
      status: string;
      interpretation: TrailerInterpretation;
      warnings: string[];
    };

export type ParseConciergeStepTrailerOptions = {
  commitSha?: string;
  logger?: Pick<MainLogger, 'warn'>;
};

const trailerPattern = /^\s*concierge-step\s*:\s*(.*)\s*$/i;

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const parseTrailerValue = (value: string): ConciergeStepTrailer => {
  const trimmedValue = value.trim();
  const exactMatch = /^([a-z0-9_-]+):([a-z0-9_-]+)$/.exec(trimmedValue);

  if (exactMatch !== null) {
    return {
      found: true,
      step: exactMatch[1] ?? 'unknown',
      status: exactMatch[2] ?? 'unknown',
      interpretation: 'exact',
      warnings: []
    };
  }

  const normalizedMatch = /^([^:]+)\s*:\s*([^:]+)$/.exec(trimmedValue);

  if (normalizedMatch !== null) {
    return {
      found: true,
      step: normalizeValue(normalizedMatch[1] ?? 'unknown'),
      status: normalizeValue(normalizedMatch[2] ?? 'unknown'),
      interpretation: 'normalized',
      warnings: []
    };
  }

  const missingStepMatch = /^:\s*(.+)$/.exec(trimmedValue);

  if (missingStepMatch !== null) {
    return {
      found: true,
      step: 'unknown',
      status: normalizeValue(missingStepMatch[1] ?? 'unknown'),
      interpretation: 'partial',
      warnings: ['partial Concierge-Step trailer recovered with missing step']
    };
  }

  if (trimmedValue.length > 0) {
    return {
      found: true,
      step: normalizeValue(trimmedValue),
      status: 'unknown',
      interpretation: 'partial',
      warnings: ['partial Concierge-Step trailer recovered with missing status']
    };
  }

  return {
    found: true,
    step: 'unknown',
    status: 'unknown',
    interpretation: 'partial',
    warnings: ['partial Concierge-Step trailer recovered with missing step and status']
  };
};

export const parseConciergeStepTrailer = (
  commitText: unknown,
  options: ParseConciergeStepTrailerOptions = {}
): ConciergeStepTrailer => {
  try {
    if (typeof commitText !== 'string') {
      return { found: false, warnings: [] };
    }

    const trailerValues = commitText
      .split(/\r?\n/)
      .map((line) => trailerPattern.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match[1] ?? '');

    if (trailerValues.length === 0) {
      return { found: false, warnings: [] };
    }

    const duplicateWarnings = trailerValues.slice(0, -1).map(
      () =>
        `superseded duplicate Concierge-Step trailer${options.commitSha ? ` in ${options.commitSha}` : ''}`
    );
    const parsed = parseTrailerValue(trailerValues[trailerValues.length - 1] ?? '');
    const warnings = [...duplicateWarnings, ...parsed.warnings];

    for (const warning of warnings) {
      options.logger?.warn(
        { commitSha: options.commitSha, warning },
        'concierge step trailer recovery warning'
      );
    }

    return { ...parsed, warnings };
  } catch (error) {
    options.logger?.warn({ error }, 'concierge step trailer parser recovered from error');
    return { found: false, warnings: [] };
  }
};
