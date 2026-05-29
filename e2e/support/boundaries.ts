import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type BoundaryFixture = {
  repoPath: string;
  ghAdapterPath: string;
  copilotAdapterPath: string;
  acpAdapterPath: string;
  repoName: string;
};

export const createRun6BoundaryFixture = async (): Promise<BoundaryFixture> => {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), 'concierge-run6-'));
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.email', 'run6@example.test'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.name', 'Run 6 Test'], { cwd: repoPath });
  await writeFile(path.join(repoPath, 'README.md'), '# Run 6 fixture\n', 'utf8');
  await execFileAsync('git', ['add', 'README.md'], { cwd: repoPath });
  await execFileAsync('git', ['commit', '-m', 'Initial fixture'], { cwd: repoPath });

  const repoName = 'concierge-api';
  const repositories = ([
    ['concierge-api', 'TypeScript'],
    ['concierge-web', 'TypeScript'],
    ['concierge-mobile', 'TypeScript'],
    ['booking-engine', 'Go'],
    ['itinerary-service', 'Go'],
    ['pricing-rules', 'Python'],
    ['guest-profile-svc', 'TypeScript'],
    ['supplier-sync', 'Python'],
    ['loyalty-ledger', 'Rust'],
    ['ops-dashboard', 'TypeScript'],
    ['concierge-shared-ui', 'TypeScript'],
    ['incident-bot', 'Python'],
    ['voucher-redeem', 'Go'],
    ['data-warehouse-etl', 'Python']
  ] as Array<[string, string]>).map(([name, language]) => ({
    id: name,
    name,
    owner: 'collette-travel',
    path: name === repoName ? repoPath : path.join(path.dirname(repoPath), name),
    defaultBranch: name === 'concierge-mobile' ? 'develop' : 'main',
    description: 'Deterministic Run 6 fixture',
    language,
    updatedAt: '2026-05-27T00:00:00Z'
  }));
  const ghAdapterPath = path.join(repoPath, 'gh-adapter.json');
  const copilotAdapterPath = path.join(repoPath, 'copilot-adapter.json');
  const acpAdapterPath = path.join(repoPath, 'acp-adapter.json');
  await writeFile(
    ghAdapterPath,
    JSON.stringify(
      {
        identity: { login: 'a.kim', displayName: 'Anika Kim' },
        repositories
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(copilotAdapterPath, JSON.stringify({ ok: true }, null, 2), 'utf8');
  await writeFile(acpAdapterPath, JSON.stringify({ ok: true }, null, 2), 'utf8');

  return { repoPath, ghAdapterPath, copilotAdapterPath, acpAdapterPath, repoName };
};

export const gitLogLastMessage = async (repoPath: string): Promise<string> => {
  const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%B'], { cwd: repoPath });
  return stdout;
};

export const gitCurrentBranch = async (repoPath: string): Promise<string> => {
  const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: repoPath });
  return stdout.trim();
};
