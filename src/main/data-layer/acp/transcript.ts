import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AcpDirection } from './protocol';

export type AnnotatedAcpRecord = {
  direction: AcpDirection;
  [key: string]: unknown;
};

export type WriteAcpTranscriptOptions = {
  userDataPath: string;
  sessionId: string;
  step: string;
  timestamp: Date;
  records: AnnotatedAcpRecord[];
  homePath?: string;
};

export class AcpTranscriptWriteError extends Error {
  constructor(readonly cause: unknown) {
    super('ACP transcript write failed');
    this.name = 'AcpTranscriptWriteError';
  }
}

const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const timestampKeyPattern = /(^timestamp$|timestamp|updatedAt|createdAt|startedAt|endedAt)/i;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeString = (value: string, homePath: string): string =>
  value.replace(new RegExp(escapeRegExp(homePath), 'g'), '/Users/<user>').replace(uuidPattern, '<sessionId-placeholder>');

const sanitizeValue = (value: unknown, homePath: string, key?: string): unknown => {
  if (key !== undefined && timestampKeyPattern.test(key)) {
    return '<timestamp>';
  }

  if (typeof value === 'string') {
    return sanitizeString(value, homePath);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, homePath));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryValue, homePath, entryKey)
      ])
    );
  }

  return value;
};

export const sanitizeAcpTranscriptRecords = (
  records: AnnotatedAcpRecord[],
  homePath = os.homedir()
): AnnotatedAcpRecord[] =>
  records.map((record) => sanitizeValue(record, homePath) as AnnotatedAcpRecord);

export const writeAcpTranscript = async ({
  userDataPath,
  sessionId,
  step,
  timestamp,
  records,
  homePath
}: WriteAcpTranscriptOptions): Promise<string> => {
  const transcriptDirectory = path.join(userDataPath, 'transcripts', sessionId);
  const transcriptPath = path.join(transcriptDirectory, `${step}-${timestamp.toISOString()}.jsonl`);

  try {
    await mkdir(transcriptDirectory, { recursive: true });
    const lines = sanitizeAcpTranscriptRecords(records, homePath)
      .map((record) => JSON.stringify(record))
      .join('\n');
    await writeFile(transcriptPath, `${lines}\n`, 'utf8');
    return transcriptPath;
  } catch (error) {
    throw new AcpTranscriptWriteError(error);
  }
};
