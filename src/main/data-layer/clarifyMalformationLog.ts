import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

export type ClarifyMalformationLogEntry = {
  sessionId: string;
  step: 'clarify';
  questionId: string;
  malformationCategory: string;
  rawOutput: string;
  timestamp: string;
  modelId: string;
};

const sanitize = (value: string): string =>
  value
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, '[redacted-token]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 2_000);

export const appendClarifyMalformation = async (
  userDataPath: string,
  entry: ClarifyMalformationLogEntry
): Promise<void> => {
  const filePath = path.join(userDataPath, 'clarify-malformations.jsonl');
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify({ ...entry, rawOutput: sanitize(entry.rawOutput) })}\n`, 'utf8');
};
