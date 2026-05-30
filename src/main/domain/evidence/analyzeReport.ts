import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoundCLIPromptUpdate } from '../../data-layer/acp/types';

export type AnalyzeReportExtractionStatus = 'captured' | 'missing' | 'ambiguous';

export type AnalyzeReportCaptureInput = {
  userDataPath: string;
  featureDir: string;
  sessionId: string;
  analyzeCommitSha: string;
  updates: readonly BoundCLIPromptUpdate[];
};

export type AnalyzeReportCaptureResult = {
  featureKey: string;
  analyzeCommitSha: string;
  reportPath: string;
  extractionStatus: AnalyzeReportExtractionStatus;
};

export type AnalyzeReportIndexEntry = AnalyzeReportCaptureResult & {
  capturedAt: string;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const textFromContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  const record = toRecord(content);
  if (typeof record.text === 'string') {
    return record.text;
  }
  if (Array.isArray(content)) {
    return content.map(textFromContent).join('');
  }
  return '';
};

export const extractAnalyzeReportMarkdown = (
  updates: readonly BoundCLIPromptUpdate[]
): { text: string; status: AnalyzeReportExtractionStatus } => {
  const messages: string[] = [];
  let current = '';

  for (const item of updates) {
    const update = item.update;
    const kind = typeof update.sessionUpdate === 'string' ? update.sessionUpdate : '';
    if (kind === 'tool_call' || kind === 'tool_call_update') {
      if (current.trim().length > 0) {
        messages.push(current);
        current = '';
      }
      continue;
    }
    if (kind !== 'agent_message_chunk') {
      continue;
    }
    current += textFromContent(update.content);
  }

  if (current.trim().length > 0) {
    messages.push(current);
  }

  const nonEmpty = messages.map((message) => message.trim()).filter(Boolean);
  if (nonEmpty.length === 0) {
    return { text: '', status: 'missing' };
  }

  return {
    text: nonEmpty[nonEmpty.length - 1] ?? '',
    status: nonEmpty.length > 1 ? 'ambiguous' : 'captured'
  };
};

export const featureKeyFromDir = (featureDir: string): string =>
  path.basename(featureDir).replace(/[^A-Za-z0-9._-]/g, '-');

export const captureAnalyzeReport = async ({
  userDataPath,
  featureDir,
  sessionId,
  analyzeCommitSha,
  updates
}: AnalyzeReportCaptureInput): Promise<AnalyzeReportCaptureResult> => {
  const featureKey = featureKeyFromDir(featureDir);
  const evidenceDir = path.join(userDataPath, 'evidence', featureKey, sessionId);
  const reportPath = path.join(evidenceDir, 'analyze-report.md');
  const extracted = extractAnalyzeReportMarkdown(updates);
  const body = extracted.text.length > 0
    ? extracted.text
    : '# Analyze report unavailable\n\nThe agent completed, but no terminal assistant markdown report was captured from the ACP stream.\n';

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(reportPath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');

  const indexPath = path.join(userDataPath, 'evidence', featureKey, 'analyze-report-index.json');
  let entries: AnalyzeReportIndexEntry[] = [];
  try {
    const existing = JSON.parse(await readFile(indexPath, 'utf8')) as unknown;
    entries = Array.isArray(existing) ? existing as AnalyzeReportIndexEntry[] : [];
  } catch {
    entries = [];
  }

  const entry: AnalyzeReportIndexEntry = {
    featureKey,
    analyzeCommitSha,
    reportPath,
    extractionStatus: extracted.status,
    capturedAt: new Date().toISOString()
  };
  const next = [...entries.filter((candidate) => candidate.analyzeCommitSha !== analyzeCommitSha), entry];
  await writeFile(indexPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

  return {
    featureKey,
    analyzeCommitSha,
    reportPath,
    extractionStatus: extracted.status
  };
};
