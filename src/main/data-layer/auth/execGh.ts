import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const resolvedPaths = new Map<string, string>();

export const resolveWindowsBinary = async (name: string): Promise<string> => {
  if (process.platform !== 'win32') return name;
  const cached = resolvedPaths.get(name);
  if (cached !== undefined) return cached;

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `$raw = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User'); $env:Path = [Environment]::ExpandEnvironmentVariables($raw); $cmd = Get-Command ${name} -ErrorAction SilentlyContinue; if ($cmd) { $cmd.Source }`
    ]);
    const resolved = stdout.trim() || name;
    resolvedPaths.set(name, resolved);
    return resolved;
  } catch {
    resolvedPaths.set(name, name);
    return name;
  }
};

export const runGh = async (args: string[]): Promise<{ stdout: string; stderr: string }> =>
  execFileAsync(await resolveWindowsBinary('gh'), args);
