import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildJiraSubmissionArtifacts } from './service';

const specMarkdown = `# Send to JIRA button

## Requirements

- **FR-001**: Create issues.
`;

const tasksMarkdown = `# Tasks

## Phase 1: Setup

- [ ] T001 First child task
`;

const createRepo = async (configYaml: string) => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'jira-service-'));
  const featureDir = path.join(repo, 'specs', '0015-send-jira-button');
  const configDir = path.join(repo, '.specify', 'extensions', 'concierge-jira');
  await mkdir(featureDir, { recursive: true });
  await mkdir(configDir, { recursive: true });
  await writeFile(path.join(featureDir, 'spec.md'), specMarkdown, 'utf8');
  await writeFile(path.join(featureDir, 'tasks.md'), tasksMarkdown, 'utf8');
  await writeFile(path.join(configDir, 'jira-config.yml'), configYaml, 'utf8');
  return { repo, featureDir };
};

describe('JIRA submission service', () => {
  it('threads an explicit top-level site URL from jira-config.yml into the plan', async () => {
    const { repo, featureDir } = await createRepo([
      'site_url: "https://collette.atlassian.net/"',
      'project:',
      '  key: "SKC"'
    ].join('\n'));

    const artifacts = await buildJiraSubmissionArtifacts(repo, async () => featureDir);

    expect(artifacts.plan.siteUrl).toBe('https://collette.atlassian.net/');
  });

  it('does not infer site URL from comments in jira-config.yml', async () => {
    const { repo, featureDir } = await createRepo([
      '# SKC lives at collette.atlassian.net',
      'project:',
      '  key: "SKC"'
    ].join('\n'));

    const artifacts = await buildJiraSubmissionArtifacts(repo, async () => featureDir);

    expect(artifacts.plan.siteUrl).toBeUndefined();
  });
});
