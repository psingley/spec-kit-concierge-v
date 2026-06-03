import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAgentManifest } from '../agents/loader';
import { BoundCLISupervisor } from '../acp/supervisor';
import type { MainLogger } from '../../logging';
import { resolveFeatureDir } from '../specify/featureDir';
import { buildJiraSubmissionPlan, type JiraSubmissionConfig, type JiraSubmissionPlan } from './plan';
import { findExplicitProjectKey, findTopLevelScalar } from './jiraConfigYaml';
import { createRestJiraCreateTurn, type JiraRestCredential } from './restCreateTurn';
import { runJiraSubmissionLoop, type JiraCreateTurn, type JiraSubmissionLoopOptions, type JiraSubmissionLoopResult } from './runner';

export type JiraSubmissionArtifacts = {
  featureDir: string;
  featureDirRelative: string;
  plan: JiraSubmissionPlan;
};

const defaultConfig: JiraSubmissionConfig = {
  projectKey: 'SKC',
  baseLabels: ['spec-kit', 'concierge']
};

const readJiraConfig = async (repositoryPath: string): Promise<JiraSubmissionConfig> => {
  try {
    const raw = await readFile(path.join(repositoryPath, '.specify', 'extensions', 'concierge-jira', 'jira-config.yml'), 'utf8');
    const lines = raw.split(/\r?\n/);
    const projectKey = findExplicitProjectKey(raw);
    const siteUrl = findTopLevelScalar(lines, ['site_url', 'siteUrl', 'base_url', 'baseUrl']);
    return {
      projectKey: projectKey || defaultConfig.projectKey,
      baseLabels: defaultConfig.baseLabels,
      ...(siteUrl !== undefined ? { siteUrl } : {})
    };
  } catch {
    return defaultConfig;
  }
};

export const buildJiraSubmissionArtifacts = async (
  repositoryPath: string,
  resolveDir: (repositoryPath: string) => Promise<string> = resolveFeatureDir,
  configOverride: Partial<JiraSubmissionConfig> = {}
): Promise<JiraSubmissionArtifacts> => {
  const featureDir = await resolveDir(repositoryPath);
  const [specMarkdown, tasksMarkdown, config] = await Promise.all([
    readFile(path.join(featureDir, 'spec.md'), 'utf8'),
    readFile(path.join(featureDir, 'tasks.md'), 'utf8'),
    readJiraConfig(repositoryPath)
  ]);
  const plan = buildJiraSubmissionPlan({ repositoryPath, featureDir, specMarkdown, tasksMarkdown, config: { ...config, ...configOverride } });
  return { featureDir, featureDirRelative: path.relative(repositoryPath, featureDir), plan };
};

export const createBoundCliJiraCreateTurn = ({
  repositoryPath,
  logger,
  userDataPath
}: {
  repositoryPath: string;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
}): JiraCreateTurn => async ({ node, payload, payloadHash, idempotencyLabel, identityLabel }) => {
  const manifest = await loadAgentManifest(logger);
  const agent = manifest.agents.copilot;
  if (agent === undefined) {
    throw new Error('Copilot agent manifest entry is missing.');
  }
  const supervisor = new BoundCLISupervisor({ agent, logger, userDataPath });
  const session = await supervisor.start();
  try {
    const sessionState = await session.newSession(repositoryPath, []);
    const prompt = [
      'Run the customized concierge-jira create-issue contract for exactly one JIRA issue.',
      'Use the repository protocol at docs/jira-submission-protocol.md and the extension config at .specify/extensions/concierge-jira/.',
      'You are the bounded CLI agent. The app has already rendered the payload, owns ordering, and is the single payload-hash authority.',
      'Create exactly one logical Jira issue for this node; duplicate/orphan recovery and transient retries are allowed only as required by the protocol.',
      `Use idempotency_id "${node.id}", payload_hash "${payloadHash}", and idempotency_label "${idempotencyLabel}" exactly as supplied by the app.`,
      `Use identity_label "${identityLabel}" for orphan search and write it back as identity_label in the state record.`,
      'Write every state record with this exact idempotency_id, payload_hash, and idempotency_label. Echo them verbatim; do not recompute a hash and do not hash the wrapper or already-rendered labels.',
      'Before creating, search Jira by the supplied identity label and adopt exactly one verified orphan if found.',
      'If an existing state record for this idempotency_id has a different payload_hash, halt without creating.',
      'On transient Jira failures (429, 5xx, network errors, timeout, no response), retry with protocol backoff for up to five total attempts.',
      'After ambiguous transient failures, run the JQL orphan search by idempotency label before retrying create.',
      'Only write status:"verified" after read-back verification confirms the issue key exists, is fetchable, summary matches, parent matches when expected, and the supplied idempotency label is present on the issue.',
      'If retries are exhausted, write the terminal failure state record required by the protocol and stop.',
      'Do not edit app source. Do not invoke the retired file-ticket LLM filer. Do not call sync-status.',
      'Write the required atomic disk state record at payload.state_dir/<idempotency_id>.json.',
      '',
      JSON.stringify({
        nodeId: node.id,
        idempotencyId: node.id,
        idempotency_id: node.id,
        payloadHash,
        payload_hash: payloadHash,
        idempotencyLabel,
        idempotency_label: idempotencyLabel,
        identityLabel,
        identity_label: identityLabel,
        payload
      }, null, 2)
    ].join('\n');
    const result = await session.prompt(sessionState.sessionId, prompt);
    if (result.stopReason !== 'complete' && result.stopReason !== 'end_turn') {
      throw new Error(`Bound JIRA create turn stopped with ${result.stopReason}`);
    }
  } finally {
    await session.dispose();
  }
};

export const runJiraSubmission = async ({
  repositoryPath,
  logger,
  userDataPath,
  jiraRestCredential,
  runCreateTurn,
  projectKeyOverride,
  onProgress,
  onResult,
  now
}: {
  repositoryPath: string;
  logger: Pick<MainLogger, 'info' | 'warn' | 'error'>;
  userDataPath?: string;
  jiraRestCredential?: JiraRestCredential;
  runCreateTurn?: JiraCreateTurn;
  projectKeyOverride?: string;
} & Pick<JiraSubmissionLoopOptions, 'onProgress' | 'onResult' | 'now'>): Promise<JiraSubmissionLoopResult> => {
  const artifacts = await buildJiraSubmissionArtifacts(repositoryPath, resolveFeatureDir, projectKeyOverride === undefined ? {} : { projectKey: projectKeyOverride });
  const createTurn = runCreateTurn ?? (
    jiraRestCredential === undefined
      ? createBoundCliJiraCreateTurn({ repositoryPath, logger, userDataPath })
      : createRestJiraCreateTurn({ credential: jiraRestCredential })
  );
  return runJiraSubmissionLoop({
    plan: artifacts.plan,
    runCreateTurn: createTurn,
    onProgress,
    onResult,
    now: now ?? (() => new Date().toISOString())
  });
};
