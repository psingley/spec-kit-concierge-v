import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureAnalyzeReport, extractAnalyzeReportMarkdown } from './analyzeReport';

describe('analyze report evidence capture', () => {
  it('extracts the final assistant markdown after tool activity', () => {
    const result = extractAnalyzeReportMarkdown([
      { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'early' } } },
      { sessionId: 's1', update: { sessionUpdate: 'tool_call_update', toolCallId: 't1' } },
      { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '# Analyze\n' } } },
      { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'No issues found.' } } }
    ]);

    expect(result).toEqual({ text: '# Analyze\nNo issues found.', status: 'ambiguous' });
  });

  it('writes app-owned report evidence and a feature commit index', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-evidence-'));

    const result = await captureAnalyzeReport({
      userDataPath,
      featureDir: '/repo/specs/0009-review-evidence',
      sessionId: 'analyze-session',
      analyzeCommitSha: 'abc123',
      updates: [
        { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '# Analyze\nClean pass.' } } }
      ]
    });

    expect(result).toMatchObject({
      featureKey: '0009-review-evidence',
      analyzeCommitSha: 'abc123',
      extractionStatus: 'captured'
    });
    await expect(readFile(result.reportPath, 'utf8')).resolves.toBe('# Analyze\nClean pass.\n');
    await expect(readFile(path.join(userDataPath, 'evidence', '0009-review-evidence', 'analyze-report-index.json'), 'utf8'))
      .resolves.toContain('"analyzeCommitSha": "abc123"');
  });
});
