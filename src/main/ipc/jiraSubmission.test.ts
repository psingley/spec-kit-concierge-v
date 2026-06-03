import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { registerJiraSubmissionIpc } from './jiraSubmission';

const createRepo = async (): Promise<{ repo: string; featureDir: string }> => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-submit-ipc-'));
  const featureDir = path.join(repo, 'specs', '0016-rest-turn');
  await mkdir(featureDir, { recursive: true });
  await mkdir(path.join(repo, '.specify', 'extensions', 'concierge-jira'), { recursive: true });
  await writeFile(path.join(repo, '.specify', 'feature.json'), JSON.stringify({ feature_directory: 'specs/0016-rest-turn' }), 'utf8');
  await writeFile(path.join(featureDir, 'spec.md'), '# REST Turn\n\n## Requirements\n\n- **FR-001**: Create via REST.\n', 'utf8');
  await writeFile(path.join(featureDir, 'tasks.md'), '# Tasks\n\n## Phase 1: Setup\n- [ ] T001 Create issue\n', 'utf8');
  await writeFile(path.join(repo, '.specify', 'extensions', 'concierge-jira', 'jira-config.yml'), 'project:\n  key: "SKC"\n', 'utf8');
  return { repo, featureDir };
};

describe('registerJiraSubmissionIpc', () => {
  it('resolves mechanism and board before returning the submit ack', async () => {
    const { repo } = await createRepo();
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const runCreateTurn = vi.fn(async () => undefined);
    const resolveMechanism = vi.fn(async () => ({ status: 'not_configured' as const }));
    registerJiraSubmissionIpc({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler as (...args: unknown[]) => Promise<unknown>);
        }
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      resolveMechanism,
      runCreateTurn
    });

    await expect(handlers.get('jira:submit')!({
      sender: { id: 1, send: vi.fn() }
    }, { repositoryPath: repo, subscriptionId: 'sub-1' })).rejects.toThrow('not_configured');

    expect(resolveMechanism).toHaveBeenCalledWith(repo);
    expect(runCreateTurn).not.toHaveBeenCalled();
  });

  it('uses the Direct credential only in the REST create turn and never passes it to process.env or delegated create turn', async () => {
    const { repo } = await createRepo();
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const send = vi.fn();
    const runJiraSubmission = vi.fn(async () => ({ status: 'pass' as const, issues: [] }));
    const createRestTurn = vi.fn(() => vi.fn());
    const createBoundTurn = vi.fn();
    registerJiraSubmissionIpc({
      ipcMain: {
        handle: (channel, handler) => {
          handlers.set(channel, handler as (...args: unknown[]) => Promise<unknown>);
        }
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      resolveMechanism: vi.fn(async () => ({
        status: 'direct' as const,
        projectKey: 'SKC',
        boardSource: 'seed' as const,
        credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' }
      })),
      runJiraSubmission,
      createRestTurn,
      createBoundTurn
    });

    const ack = await handlers.get('jira:submit')!({
      sender: { id: 1, send }
    }, { repositoryPath: repo, subscriptionId: 'sub-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ack).toMatchObject({ accepted: true, subscriptionId: 'sub-1' });
    expect(createRestTurn).toHaveBeenCalledWith({
      credential: { email: 'person@example.com', token: 'secret-token', baseUrl: 'https://example.atlassian.net' }
    });
    expect(createBoundTurn).not.toHaveBeenCalled();
    expect(process.env).not.toHaveProperty('JIRA_TOKEN');
    expect(JSON.stringify(process.env)).not.toContain('secret-token');
  });
});
