import type { ExecFileException } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

type ExecFileCallback = (error: ExecFileException | null, result: { stdout: string; stderr: string }) => void;
type ExecFileMockImplementation = (
  command: string,
  args: string[],
  options: unknown,
  callback: ExecFileCallback
) => void;

const childProcess = vi.hoisted(() => {
  let implementation: ExecFileMockImplementation = (_command, _args, _options, callback) => {
    callback(Object.assign(new Error('execFile mock not configured'), { code: 'ENOENT' }), { stdout: '', stderr: '' });
  };
  const execFile = vi.fn((command: string, args: string[], optionsOrCallback: unknown, maybeCallback?: ExecFileCallback) => {
    const callback = (typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback) as ExecFileCallback | undefined;
    if (callback === undefined) {
      throw new Error('execFile mock requires a callback');
    }
    implementation(command, args, typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback, callback);
  });
  return {
    execFile,
    setExecFile: (next: ExecFileMockImplementation): void => {
      implementation = next;
    }
  };
});

vi.mock('node:child_process', () => ({
  default: {
    execFile: childProcess.execFile
  },
  execFile: childProcess.execFile
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { value: platform });
};

const restorePlatform = (): void => {
  if (originalPlatform !== undefined) {
    Object.defineProperty(process, 'platform', originalPlatform);
  }
};

afterEach(() => {
  vi.resetModules();
  childProcess.execFile.mockClear();
  restorePlatform();
});

describe('repoList default GitHub CLI execution', () => {
  it('resolves gh before the default exec adapter lists repositories on win32', async () => {
    setPlatform('win32');
    childProcess.setExecFile((command, args, _options, callback) => {
      if (command === 'powershell.exe') {
        callback(null, { stdout: 'C:\\Program Files\\GitHub CLI\\gh.exe\n', stderr: '' });
        return;
      }
      if (command === 'C:\\Program Files\\GitHub CLI\\gh.exe' && args[0] === 'repo') {
        callback(null, {
          stdout: JSON.stringify([
            {
              id: 'R_repo',
              name: 'repo',
              owner: { login: 'collette-travel' },
              defaultBranchRef: { name: 'main' }
            }
          ]),
          stderr: ''
        });
        return;
      }
      callback(Object.assign(new Error(`unexpected command: ${command}`), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });
    const { listRepositories } = await import('./repoList');

    await expect(listRepositories('collette-travel', '')).resolves.toMatchObject([
      { id: 'R_repo', name: 'repo', owner: 'collette-travel' }
    ]);

    expect(childProcess.execFile).toHaveBeenCalledWith(
      'C:\\Program Files\\GitHub CLI\\gh.exe',
      [
        'repo',
        'list',
        'collette-travel',
        '--limit',
        '1000',
        '--json',
        'id,name,owner,description,primaryLanguage,pushedAt,defaultBranchRef'
      ],
      { shell: false },
      expect.any(Function)
    );
  });

  it('passes raw gh through the default exec adapter on non-win32 platforms', async () => {
    setPlatform('darwin');
    childProcess.setExecFile((command, args, _options, callback) => {
      if (command === 'gh' && args[0] === 'repo') {
        callback(null, {
          stdout: JSON.stringify([
            {
              id: 'R_repo',
              name: 'repo',
              owner: { login: 'collette-travel' },
              defaultBranchRef: { name: 'main' }
            }
          ]),
          stderr: ''
        });
        return;
      }
      callback(Object.assign(new Error(`unexpected command: ${command}`), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });
    const { listRepositories } = await import('./repoList');

    await expect(listRepositories('collette-travel', '')).resolves.toMatchObject([
      { id: 'R_repo', name: 'repo', owner: 'collette-travel' }
    ]);

    expect(childProcess.execFile).not.toHaveBeenCalledWith('powershell.exe', expect.anything(), expect.anything(), expect.anything());
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['repo', 'list', 'collette-travel']),
      { shell: false },
      expect.any(Function)
    );
  });
});
