import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { loginCopilot, loginGitHub, parseGitHubAuthStatus, type ExecFileAdapter } from './cliAuth';

const authedSingle = `github.com
  ✓ Logged in to github.com account monalisa (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
`;

const authedMulti = `github.com
  ✓ Logged in to github.com account psingley (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'

  ✓ Logged in to github.com account psingley_collette (keyring)
  - Active account: false
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
`;

const authedMultiInactiveFirst = `github.com
  ✓ Logged in to github.com account psingley_collette (keyring)
  - Active account: false
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'

  ✓ Logged in to github.com account psingley (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
`;

const notAuthed = `github.com
  X github.com: authentication failed
  - The github.com token in /Users/example/.config/gh/hosts.yml is invalid.
  - To re-authenticate, run: gh auth login -h github.com
  - To forget about this host, run: gh auth logout -h github.com
`;

describe('parseGitHubAuthStatus', () => {
  it('detects a single active GitHub CLI account', () => {
    expect(parseGitHubAuthStatus(authedSingle)).toEqual({ authenticated: true, login: 'monalisa' });
  });

  it('uses the active account when multiple GitHub CLI accounts are present', () => {
    expect(parseGitHubAuthStatus(authedMulti)).toEqual({ authenticated: true, login: 'psingley' });
  });

  it('does not confuse an inactive account block with a later active account', () => {
    expect(parseGitHubAuthStatus(authedMultiInactiveFirst)).toEqual({ authenticated: true, login: 'psingley' });
  });

  it('reports not authenticated when gh status has no active account', () => {
    expect(parseGitHubAuthStatus(notAuthed)).toEqual({ authenticated: false });
  });
});

describe('loginGitHub', () => {
  it('returns the active identity without starting gh auth login when gh is already authenticated', async () => {
    const invocations: string[] = [];
    const execFile: ExecFileAdapter = async (_command, args) => {
      invocations.push(args.join(' '));
      if (args[0] === 'auth' && args[1] === 'status') {
        return { stdout: authedMulti, stderr: '' };
      }
      if (args[0] === 'api' && args[1] === 'user') {
        return {
          stdout: JSON.stringify({
            login: 'psingley',
            name: null,
            avatar_url: 'https://avatars.githubusercontent.com/u/9373319?v=4'
          }),
          stderr: ''
        };
      }
      throw new Error(`unexpected gh invocation: ${args.join(' ')}`);
    };

    await expect(loginGitHub('', execFile)).resolves.toEqual({
      status: 'ok',
      provider: 'github',
      identity: {
        login: 'psingley',
        displayName: undefined,
        avatarUrl: 'https://avatars.githubusercontent.com/u/9373319?v=4'
      }
    });
    expect(invocations).toEqual(['auth status --active --hostname github.com', 'api user']);
  });

  it('starts the web login flow and rechecks status when gh is not authenticated', async () => {
    const invocations: string[] = [];
    const execFile: ExecFileAdapter = async (_command, args) => {
      invocations.push(args.join(' '));
      if (args[0] === 'auth' && args[1] === 'status' && invocations.length === 1) {
        return { stdout: notAuthed, stderr: '' };
      }
      if (args[0] === 'auth' && args[1] === 'login') {
        return { stdout: '', stderr: '' };
      }
      if (args[0] === 'auth' && args[1] === 'status') {
        return { stdout: authedSingle, stderr: '' };
      }
      if (args[0] === 'api' && args[1] === 'user') {
        return { stdout: JSON.stringify({ login: 'monalisa', name: 'Mona Lisa', avatar_url: null }), stderr: '' };
      }
      throw new Error(`unexpected gh invocation: ${args.join(' ')}`);
    };

    await expect(loginGitHub('', execFile)).resolves.toEqual({
      status: 'ok',
      provider: 'github',
      identity: { login: 'monalisa', displayName: 'Mona Lisa', avatarUrl: undefined }
    });
    expect(invocations).toEqual([
      'auth status --active --hostname github.com',
      'auth login --web --hostname github.com --git-protocol https',
      'auth status --active --hostname github.com',
      'api user'
    ]);
  });
});

describe('loginCopilot', () => {
  it('returns quickly without starting copilot login when the active GitHub account has a Copilot CLI credential', async () => {
    const invocations: string[] = [];
    const execFile: ExecFileAdapter = async (command, args) => {
      invocations.push(`${command} ${args.join(' ')}`);
      if (command === 'gh' && args[0] === 'auth' && args[1] === 'status') {
        return { stdout: authedSingle, stderr: '' };
      }
      if (command === 'security' && args[0] === 'find-generic-password') {
        return { stdout: '', stderr: '' };
      }
      throw new Error(`unexpected invocation: ${command} ${args.join(' ')}`);
    };

    await expect(loginCopilot(true, '', execFile, 'darwin')).resolves.toEqual({
      status: 'ok',
      provider: 'copilot',
      label: 'Copilot CLI ready'
    });
    expect(invocations).toEqual([
      'gh auth status --active --hostname github.com',
      'security find-generic-password -s copilot-cli -a https://github.com:monalisa'
    ]);
  });

  it('streams the Copilot device code from stdout and verifies the credential when login exits', async () => {
    const invocations: string[] = [];
    let credentialExists = false;
    const execFile: ExecFileAdapter = async (command, args) => {
      invocations.push(`${command} ${args.join(' ')}`);
      if (command === 'gh' && args[0] === 'auth' && args[1] === 'status') {
        return { stdout: authedSingle, stderr: '' };
      }
      if (command === 'security' && args[0] === 'find-generic-password') {
        if (credentialExists) {
          return { stdout: '', stderr: '' };
        }
        throw new Error('credential not found');
      }
      throw new Error(`unexpected invocation: ${command} ${args.join(' ')}`);
    };
    const deviceCodes: Array<{ code: string; url: string }> = [];
    const spawnAdapter = () => {
      const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('To authenticate, visit https://github.com/login/device and enter code 023C-3350.\nWaiting for authorization...\n'));
        credentialExists = true;
        child.emit('exit', 0);
        child.emit('close', 0);
      });
      return child;
    };

    await expect(loginCopilot(true, '', execFile, 'darwin', {
      onDeviceCode: (info) => deviceCodes.push(info),
      spawnAdapter
    })).resolves.toEqual({
      status: 'ok',
      provider: 'copilot',
      label: 'Copilot CLI ready'
    });
    expect(invocations).toEqual([
      'gh auth status --active --hostname github.com',
      'security find-generic-password -s copilot-cli -a https://github.com:monalisa',
      'security find-generic-password -s copilot-cli -a https://github.com:monalisa'
    ]);
    expect(deviceCodes).toEqual([{ code: '023C-3350', url: 'https://github.com/login/device' }]);
  });

  it('throws after Copilot login exits when the credential is still missing', async () => {
    const execFile: ExecFileAdapter = async (command, args) => {
      if (command === 'gh' && args[0] === 'auth' && args[1] === 'status') {
        return { stdout: authedSingle, stderr: '' };
      }
      if (command === 'security' && args[0] === 'find-generic-password') {
        throw new Error('credential not found');
      }
      throw new Error(`unexpected invocation: ${command} ${args.join(' ')}`);
    };
    const deviceCodes: Array<{ code: string; url: string }> = [];
    const spawnAdapter = () => {
      const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('023C-3350\n'));
        child.emit('exit', 0);
        child.emit('close', 0);
      });
      return child;
    };

    await expect(loginCopilot(true, '', execFile, 'darwin', {
      onDeviceCode: (info) => deviceCodes.push(info),
      spawnAdapter
    })).rejects.toThrow('Copilot CLI login did not complete.');
    expect(deviceCodes).toEqual([{ code: '023C-3350', url: 'https://github.com/login/device' }]);
  });

  it('requires GitHub to be connected before Copilot login', async () => {
    const execFile: ExecFileAdapter = async () => {
      throw new Error('should not cross the OS boundary');
    };

    await expect(loginCopilot(false, '', execFile, 'darwin')).rejects.toThrow('GitHub login is required before Copilot login.');
  });
});
