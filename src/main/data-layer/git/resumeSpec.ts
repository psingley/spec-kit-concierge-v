import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runGit as runGitDefault } from './gitCommand';

export type ResumeSpec = {
  specMarkdown: string;
  specCommitSha: string | null;
};

export type ReadResumeSpecDeps = {
  // cwd-parametric git runner (defaults to the real runGit). Tests stub this.
  runGit?: (cwd: string, args: string[]) => Promise<string>;
  // Filesystem seam so reads can be asserted/stubbed in tests.
  readFileText?: (filePath: string) => Promise<string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Resolve the feature dir from the worktree's .specify/feature.json (key
// feature_directory, relative to the worktree root) — the same convention the
// copilotSpecify handler uses. Returns undefined when the manifest is missing or
// malformed so the caller can degrade gracefully.
const resolveFeatureDir = async (
  worktreePath: string,
  readFileText: (filePath: string) => Promise<string>
): Promise<string | undefined> => {
  const manifestPath = path.join(worktreePath, '.specify', 'feature.json');
  let raw: string;
  try {
    raw = await readFileText(manifestPath);
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || typeof parsed.feature_directory !== 'string' || parsed.feature_directory.trim().length === 0) {
    return undefined;
  }
  return path.join(worktreePath, parsed.feature_directory);
};

/**
 * Read a resumed session's committed spec from its worktree IN PLACE
 * (ADR-0016): the worktree already has the files checked out, so the spec is
 * read straight from the working tree (no `git show`/checkout in the clone).
 *
 * Graceful by design: an in-flight session may have no .specify/feature.json or
 * no spec.md yet. Any of those cases returns `{ specMarkdown: '', specCommitSha:
 * null }` rather than throwing — resume must never fail because the prior step is
 * incomplete.
 */
export const readResumeSpec = async (
  worktreePath: string,
  deps: ReadResumeSpecDeps = {}
): Promise<ResumeSpec> => {
  const runGit = deps.runGit ?? runGitDefault;
  const readFileText = deps.readFileText ?? ((filePath: string) => readFile(filePath, 'utf8'));

  let specCommitSha: string | null = null;
  try {
    const head = (await runGit(worktreePath, ['rev-parse', 'HEAD'])).trim();
    specCommitSha = head.length > 0 ? head : null;
  } catch {
    specCommitSha = null;
  }

  const featureDir = await resolveFeatureDir(worktreePath, readFileText);
  if (featureDir === undefined) {
    return { specMarkdown: '', specCommitSha };
  }

  let specMarkdown = '';
  try {
    specMarkdown = await readFileText(path.join(featureDir, 'spec.md'));
  } catch {
    specMarkdown = '';
  }

  return { specMarkdown, specCommitSha };
};
