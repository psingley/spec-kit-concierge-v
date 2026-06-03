import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { createJiraBoardMappingService, parseExplicitJiraProjectKey } from './jiraBoardMappingService';

const execFileAsync = promisify(execFile);

const git = async (cwd: string, args: string[]): Promise<void> => {
  await execFileAsync('git', args, { cwd });
};

describe('jiraBoardMappingService', () => {
  it('keys mappings by canonical git remote owner/repo and keeps path aliases', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-board-map-'));
    const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-board-repo-'));
    await git(repo, ['init']);
    await git(repo, ['remote', 'add', 'origin', 'git@github.com:Collette-Travel/spec-kit-concierge-v.git']);
    const service = createJiraBoardMappingService({ userDataPath });

    await service.setBoard(repo, 'SKC');

    await expect(service.getBoard(repo)).resolves.toEqual({ projectKey: 'SKC', source: 'user' });
    const alias = JSON.parse(await service.readRawForTest()) as { aliases: Record<string, string> };
    expect(alias.aliases[path.normalize(repo)]).toBe('collette-travel/spec-kit-concierge-v');
  });

  it('falls back to a normalized repository path when no remote exists', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-board-map-'));
    const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-board-repo-'));
    const service = createJiraBoardMappingService({ userDataPath });

    await service.setBoard(repo, 'OPS');

    await expect(service.getBoard(repo)).resolves.toEqual({ projectKey: 'OPS', source: 'user' });
    await expect(service.isConfigured(repo)).resolves.toBe(true);
  });

  it('seeds from explicit jira-config.yml key using the fixed scalar parser, but default SKC does not count as configured', async () => {
    const userDataPath = await mkdtemp(path.join(os.tmpdir(), 'jira-board-map-'));
    const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-board-repo-'));
    const configDir = path.join(repo, '.specify', 'extensions', 'concierge-jira');
    await mkdir(configDir, { recursive: true });
    await writeFile(path.join(configDir, 'jira-config.yml'), [
      '# comment',
      'project:',
      '  key: "SKC"  # Spec-Kit Concierge project'
    ].join('\n'), 'utf8');
    const service = createJiraBoardMappingService({ userDataPath });

    expect(parseExplicitJiraProjectKey('project:\n  key: "SKC"  # comment\n')).toBe('SKC');
    await expect(service.getBoard(repo)).resolves.toEqual({ projectKey: 'SKC', source: 'seed' });
    await expect(service.isConfigured(repo)).resolves.toBe(true);

    await writeFile(path.join(configDir, 'jira-config.yml'), '# no explicit key here\n', 'utf8');
    const unconfiguredRepo = await mkdtemp(path.join(os.tmpdir(), 'jira-board-repo-'));
    await expect(service.getBoard(unconfiguredRepo)).resolves.toEqual({ projectKey: undefined, source: 'none' });
    await expect(service.isConfigured(unconfiguredRepo)).resolves.toBe(false);
  });
});
