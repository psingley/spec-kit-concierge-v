import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBoundarySpecifyAgentAdapter } from './copilotSpecify.boundaryAdapter';

describe('createBoundarySpecifyAgentAdapter', () => {
  it('writes feature.json and spec.md through the deterministic boundary adapter', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'concierge-boundary-specify-'));
    const adapterPath = path.join(directory, 'adapter.json');
    const repositoryPath = path.join(directory, 'repo');
    const onUpdate = vi.fn();
    await writeFile(
      adapterPath,
      JSON.stringify({
        ok: true,
        featureDirectory: 'specs/0001-hello-world-feature',
        specMarkdown: '# Hello-world feature\n'
      }),
      'utf8'
    );

    const adapter = createBoundarySpecifyAgentAdapter(adapterPath);
    await adapter?.({
      subscriptionId: 'sub-1',
      repositoryPath,
      branch: 'main',
      prompt: 'Build a hello-world feature',
      sessionId: 'specify-1',
      featureDir: repositoryPath,
      copilotSessionId: '00000000-0000-4000-8000-000000000000',
      logDir: path.join(directory, 'logs'),
      onUpdate
    });

    await expect(readFile(path.join(repositoryPath, '.specify', 'feature.json'), 'utf8')).resolves.toContain(
      'specs/0001-hello-world-feature'
    );
    await expect(readFile(path.join(repositoryPath, 'specs/0001-hello-world-feature/spec.md'), 'utf8')).resolves.toBe(
      '# Hello-world feature\n'
    );
    expect(onUpdate).toHaveBeenCalledWith('Specify complete');
  });

  it('rejects unsafe feature directories before writing artifacts', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'concierge-boundary-specify-'));
    const adapterPath = path.join(directory, 'adapter.json');
    await writeFile(adapterPath, JSON.stringify({ ok: true, featureDirectory: '../outside' }), 'utf8');

    const adapter = createBoundarySpecifyAgentAdapter(adapterPath);

    await expect(
      adapter?.({
        subscriptionId: 'sub-1',
        repositoryPath: path.join(directory, 'repo'),
        branch: 'main',
        prompt: 'Build a hello-world feature',
        sessionId: 'specify-1',
        featureDir: path.join(directory, 'repo'),
        copilotSessionId: '00000000-0000-4000-8000-000000000000',
        logDir: path.join(directory, 'logs')
      })
    ).rejects.toThrow('repo-relative');
  });
});
