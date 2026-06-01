import { readFile, stat } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerArtifactsIpc, ARTIFACTS_READ_CHANNEL } from './artifacts';

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  stat: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: fsMocks.readFile,
    stat: fsMocks.stat
  },
  readFile: fsMocks.readFile,
  stat: fsMocks.stat
}));

const mockedReadFile = vi.mocked(readFile);
const mockedStat = vi.mocked(stat);

const invoke = async (payload: unknown, resolveFeatureDir?: (repositoryPath: string) => Promise<string>): Promise<unknown> => {
  const handle = vi.fn();
  const logger = { info: vi.fn(), error: vi.fn() };
  registerArtifactsIpc({ ipcMain: { handle }, logger, now: () => 10, resolveFeatureDir });
  const handler = handle.mock.calls[0]?.[1] as (event: unknown, payload: unknown) => Promise<unknown>;
  return handler({ sender: { id: 7 } }, payload);
};

describe('registerArtifactsIpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStat.mockResolvedValue({ size: 6, mtimeMs: 1 } as never);
    mockedReadFile.mockResolvedValue('# Plan' as never);
  });

  it('registers artifacts:read', async () => {
    const handle = vi.fn();
    const logger = { info: vi.fn(), error: vi.fn() };
    registerArtifactsIpc({ ipcMain: { handle }, logger, now: () => 10, resolveFeatureDir: async () => '/repo/specs/0012' });
    expect(handle).toHaveBeenCalledWith(ARTIFACTS_READ_CHANNEL, expect.any(Function));
  });

  it('resolves a bare artifact name against the feature dir from feature.json', async () => {
    const resolveFeatureDir = vi.fn(async () => '/repo/specs/0012-feature');

    await expect(invoke({ repositoryPath: '/repo', artifactPath: 'plan.md' }, resolveFeatureDir)).resolves.toEqual({
      artifactPath: 'plan.md',
      text: '# Plan',
      size: 6,
      mtimeMs: 1
    });

    expect(resolveFeatureDir).toHaveBeenCalledWith('/repo');
    expect(mockedStat).toHaveBeenCalledWith('/repo/specs/0012-feature/plan.md');
    expect(mockedReadFile).toHaveBeenCalledWith('/repo/specs/0012-feature/plan.md', 'utf8');
  });

  it('treats a path already containing a specs/ segment as repo-root-relative (no double prefix)', async () => {
    const resolveFeatureDir = vi.fn(async () => '/repo/specs/0012-feature');

    await invoke({ repositoryPath: '/repo', artifactPath: 'specs/0012-feature/research.md' }, resolveFeatureDir);

    expect(resolveFeatureDir).not.toHaveBeenCalled();
    expect(mockedStat).toHaveBeenCalledWith('/repo/specs/0012-feature/research.md');
  });

  it('falls back to the repository root join when feature.json is missing', async () => {
    const resolveFeatureDir = vi.fn(async () => {
      throw new Error('spec-kit feature directory not found (.specify/feature.json missing)');
    });

    await invoke({ repositoryPath: '/repo', artifactPath: 'plan.md' }, resolveFeatureDir);

    expect(mockedStat).toHaveBeenCalledWith('/repo/plan.md');
    expect(mockedReadFile).toHaveBeenCalledWith('/repo/plan.md', 'utf8');
  });

  it('rejects files larger than the artifact guard', async () => {
    mockedStat.mockResolvedValue({ size: 512 * 1024 + 1, mtimeMs: 1 } as never);
    const resolveFeatureDir = vi.fn(async () => '/repo/specs/0012-feature');

    await expect(invoke({ repositoryPath: '/repo', artifactPath: 'plan.md' }, resolveFeatureDir)).rejects.toThrow(
      'Artifact is too large to read.'
    );
    expect(mockedReadFile).not.toHaveBeenCalled();
  });
});
