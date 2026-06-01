import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetGitBinaryCacheForTests, resolveGitBinary, type GitBinaryProbe } from './gitBinary';

afterEach(() => {
  __resetGitBinaryCacheForTests();
  vi.restoreAllMocks();
});

const accessHits = (...hits: string[]): GitBinaryProbe => async (candidate: string) => hits.includes(candidate);
const accessNever: GitBinaryProbe = async () => false;

describe('resolveGitBinary', () => {
  it('returns plain git when it resolves on PATH (dev path)', async () => {
    const probe = vi.fn(accessHits('git'));
    const resolved = await resolveGitBinary({ platform: 'darwin', env: {}, probePath: probe, probeFile: accessNever });
    expect(resolved).toBe('git');
    // PATH probe is consulted first; file candidates are never touched.
  });

  it('falls back to a darwin candidate when git is not on PATH', async () => {
    const tried: string[] = [];
    const probeFile: GitBinaryProbe = async (candidate) => {
      tried.push(candidate);
      return candidate === '/opt/homebrew/bin/git';
    };
    const resolved = await resolveGitBinary({ platform: 'darwin', env: {}, probePath: accessNever, probeFile });
    expect(resolved).toBe('/opt/homebrew/bin/git');
    expect(tried).toEqual(['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git']);
  });

  it('falls back to a win32 candidate using backslash paths only', async () => {
    const tried: string[] = [];
    // Match the LAST candidate so the whole win32 list is exercised.
    const localAppDataGit = 'C:\\Users\\dev\\AppData\\Local\\Programs\\Git\\cmd\\git.exe';
    const probeFile: GitBinaryProbe = async (candidate) => {
      tried.push(candidate);
      return candidate === localAppDataGit;
    };
    const resolved = await resolveGitBinary({
      platform: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\dev\\AppData\\Local' },
      probePath: accessNever,
      probeFile
    });
    expect(resolved).toBe(localAppDataGit);
    // No POSIX separators in any win32 candidate that was tried.
    for (const candidate of tried) {
      expect(candidate.includes('/')).toBe(false);
    }
    expect(tried).toContain('C:\\Program Files\\Git\\cmd\\git.exe');
    expect(tried).toContain('C:\\Program Files\\Git\\bin\\git.exe');
    expect(tried).toContain(localAppDataGit);
  });

  it('probes git.exe (not bare git) on PATH for win32', async () => {
    const probePath = vi.fn(accessHits('git.exe'));
    const resolved = await resolveGitBinary({ platform: 'win32', env: {}, probePath, probeFile: accessNever });
    expect(resolved).toBe('git.exe');
    expect(probePath).toHaveBeenCalledWith('git.exe');
  });

  it('throws a clear git-not-found error when nothing resolves', async () => {
    await expect(
      resolveGitBinary({ platform: 'darwin', env: {}, probePath: accessNever, probeFile: accessNever })
    ).rejects.toThrow(/git executable could not be found/i);
  });

  it('honors the CONCIERGE_TEST_GIT_BINARY override without touching PATH or the filesystem', async () => {
    const probePath = vi.fn(accessNever);
    const probeFile = vi.fn(accessNever);
    const resolved = await resolveGitBinary({
      platform: 'darwin',
      env: { CONCIERGE_TEST_GIT_BINARY: '/fake/git' },
      probePath,
      probeFile
    });
    expect(resolved).toBe('/fake/git');
    expect(probePath).not.toHaveBeenCalled();
    expect(probeFile).not.toHaveBeenCalled();
  });

  it('caches the resolved binary so the probe runs once', async () => {
    const probePath = vi.fn(accessHits('git'));
    await resolveGitBinary({ platform: 'darwin', env: {}, probePath, probeFile: accessNever });
    await resolveGitBinary({ platform: 'darwin', env: {}, probePath, probeFile: accessNever });
    expect(probePath).toHaveBeenCalledTimes(1);
  });
});
