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
    },
    spawn: vi.fn()
  };
});

vi.mock('node:child_process', () => ({
  default: {
    execFile: childProcess.execFile,
    spawn: childProcess.spawn
  },
  execFile: childProcess.execFile,
  spawn: childProcess.spawn
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
  childProcess.spawn.mockClear();
  restorePlatform();
});

describe('cliAuth default GitHub CLI execution', () => {
  it('resolves gh before the default exec adapter crosses the process boundary on win32', async () => {
    setPlatform('win32');
    childProcess.setExecFile((command, args, _options, callback) => {
      if (command === 'powershell.exe') {
        callback(null, { stdout: 'C:\\Program Files\\GitHub CLI\\gh.exe\n', stderr: '' });
        return;
      }
      if (command === 'C:\\Program Files\\GitHub CLI\\gh.exe' && args[0] === 'auth' && args[1] === 'status') {
        callback(null, {
          stdout: `github.com
  ✓ Logged in to github.com account monalisa (keyring)
  - Active account: true
`,
          stderr: ''
        });
        return;
      }
      if (command === 'C:\\Program Files\\GitHub CLI\\gh.exe' && args[0] === 'api' && args[1] === 'user') {
        callback(null, { stdout: JSON.stringify({ login: 'monalisa' }), stderr: '' });
        return;
      }
      callback(Object.assign(new Error(`unexpected command: ${command}`), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });
    const { loginGitHub } = await import('./cliAuth');

    await expect(loginGitHub('')).resolves.toMatchObject({ status: 'ok', provider: 'github' });

    expect(childProcess.execFile).toHaveBeenCalledWith(
      'C:\\Program Files\\GitHub CLI\\gh.exe',
      ['auth', 'status', '--active', '--hostname', 'github.com'],
      { shell: false },
      expect.any(Function)
    );
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'C:\\Program Files\\GitHub CLI\\gh.exe',
      ['api', 'user'],
      { shell: false },
      expect.any(Function)
    );
  });

  it('passes raw gh through the default exec adapter on non-win32 platforms', async () => {
    setPlatform('darwin');
    childProcess.setExecFile((command, args, _options, callback) => {
      if (command === 'gh' && args[0] === 'auth' && args[1] === 'status') {
        callback(null, {
          stdout: `github.com
  ✓ Logged in to github.com account monalisa (keyring)
  - Active account: true
`,
          stderr: ''
        });
        return;
      }
      if (command === 'gh' && args[0] === 'api' && args[1] === 'user') {
        callback(null, { stdout: JSON.stringify({ login: 'monalisa' }), stderr: '' });
        return;
      }
      callback(Object.assign(new Error(`unexpected command: ${command}`), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });
    const { loginGitHub } = await import('./cliAuth');

    await expect(loginGitHub('')).resolves.toMatchObject({ status: 'ok', provider: 'github' });

    expect(childProcess.execFile).not.toHaveBeenCalledWith('powershell.exe', expect.anything(), expect.anything(), expect.anything());
    expect(childProcess.execFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'status', '--active', '--hostname', 'github.com'],
      { shell: false },
      expect.any(Function)
    );
  });
});
