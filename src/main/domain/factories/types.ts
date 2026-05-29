import type { StepName } from '../../hooks/manifest';
import type { StepEscapeHatchReason } from '../../hooks/types';
import type { MainLogger } from '../../logging';

export type ConciergeStepCommit = {
  step: StepName;
  status: 'pass';
  files: string[];
  message: string;
  allowEmptyCommit?: boolean;
};

export type StepContractResult =
  | { ok: true; commit: ConciergeStepCommit; questions?: ClarifyQuestion[] }
  | { ok: false; kind?: 'escape-hatch'; escapeHatchReason: StepEscapeHatchReason }
  | {
      ok: false;
      kind: 'malformed-questions';
      wellFormedQuestions: ClarifyQuestion[];
      malformedQuestions: MalformedClarifyQuestion[];
      rawText: string;
    };

export type StepContractContext = {
  modelId?: string;
  contextFilePath?: string;
  remediationFiles?: readonly string[];
  now?: () => Date;
  logger?: Pick<MainLogger, 'warn'>;
};

export type ClarifyChoice = {
  key: string;
  label: string;
};

export type ClarifyQuestion = {
  id: string;
  position: number;
  text: string;
  choices: ClarifyChoice[];
};

export type MalformedClarifyQuestion = {
  id: string;
  position: number;
  malformationCategory: string;
  rawOutput: string;
};
