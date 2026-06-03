import crypto from 'node:crypto';
import path from 'node:path';
import { parseJiraTicketModel } from './parser';
import { buildTicketDocument } from './ticketDocument';

export type JiraIssueType = 'Epic' | 'Story' | 'Subtask';

export type JiraSubmissionConfig = {
  projectKey: string;
  baseLabels: string[];
  siteUrl?: string;
};

export type JiraSubmissionPayload = {
  idempotency_id: string;
  state_dir: string;
  project_key: string;
  issue_type: JiraIssueType;
  summary: string;
  description: string;
  labels: string[];
  parent_key: string | null;
  relationship_field: string | null;
};

export type JiraSubmissionNode = {
  id: string;
  issueType: JiraIssueType;
  parentId: string | null;
  summary: string;
  description: string;
  labels: string[];
  identityLabel: string;
  idempotencyLabel: string;
  payloadHash: string;
  payload: JiraSubmissionPayload;
};

export type JiraSubmissionPlan = {
  featureSlug: string;
  stateDir: string;
  siteUrl?: string;
  nodes: JiraSubmissionNode[];
  warnings: string[];
};

export type BuildJiraSubmissionPlanRequest = {
  repositoryPath: string;
  featureDir: string;
  specMarkdown: string;
  tasksMarkdown: string;
  config: JiraSubmissionConfig;
};

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.normalize('NFC');
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return Object.keys(record).sort().reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = normalizeValue(record[key]);
      return acc;
    }, {});
  }
  return value;
};

export const createPayloadHash = (value: unknown): string =>
  crypto.createHash('sha256').update(JSON.stringify(normalizeValue(value))).digest('hex');

const clampSummary = (value: string): string =>
  value.length <= 255 ? value : `${value.slice(0, 254).trimEnd()}…`;

export const canonicalIdempotencyLabel = (projectKey: string, payloadHash: string): string =>
  `${projectKey}-idem-${payloadHash.slice(0, 12)}`;

export const canonicalIdentityLabel = (projectKey: string, idempotencyId: string): string =>
  `${projectKey}-id-${crypto.createHash('sha256').update(idempotencyId).digest('hex').slice(0, 12)}`;

const createNode = (
  request: {
    id: string;
    stateDir: string;
    projectKey: string;
    issueType: JiraIssueType;
    summary: string;
    description: string;
    parentId: string | null;
    parentKey: string | null;
    baseLabels: string[];
  }
): JiraSubmissionNode => {
  const summary = clampSummary(request.summary);
  const identityLabel = canonicalIdentityLabel(request.projectKey, request.id);
  const payloadWithoutIdem: JiraSubmissionPayload = {
    idempotency_id: request.id,
    state_dir: request.stateDir,
    project_key: request.projectKey,
    issue_type: request.issueType,
    summary,
    description: request.description,
    labels: [...request.baseLabels],
    parent_key: request.parentKey,
    relationship_field: null
  };
  const payloadHash = createPayloadHash(payloadWithoutIdem);
  const idemLabel = canonicalIdempotencyLabel(request.projectKey, payloadHash);
  const labels = [...request.baseLabels, identityLabel, idemLabel];

  return {
    id: request.id,
    issueType: request.issueType,
    parentId: request.parentId,
    summary,
    description: request.description,
    labels,
    identityLabel,
    idempotencyLabel: idemLabel,
    payloadHash,
    payload: { ...payloadWithoutIdem, labels }
  };
};

export const buildJiraSubmissionPlan = ({
  featureDir,
  specMarkdown,
  tasksMarkdown,
  config
}: BuildJiraSubmissionPlanRequest): JiraSubmissionPlan => {
  const featureSlug = path.basename(featureDir);
  const stateDir = path.join(featureDir, 'jira-submission-state');
  const baseLabels = [...config.baseLabels, featureSlug].filter((label, index, labels) => labels.indexOf(label) === index);
  const model = parseJiraTicketModel({ featureSlug, specMarkdown, tasksMarkdown });
  const warnings: string[] = [...model.warnings];
  const nodes: JiraSubmissionNode[] = [];
  const epicId = model.epic.id;
  const epicDocument = buildTicketDocument(model, epicId);

  nodes.push(createNode({
    id: epicId,
    stateDir,
    projectKey: config.projectKey,
    issueType: 'Epic',
    summary: epicDocument.summary,
    description: epicDocument.markdown,
    parentId: null,
    parentKey: null,
    baseLabels
  }));

  for (const story of model.stories) {
    const storyDocument = buildTicketDocument(model, story.id);
    nodes.push(createNode({
      id: story.id,
      stateDir,
      projectKey: config.projectKey,
      issueType: 'Story',
      summary: storyDocument.summary,
      description: storyDocument.markdown,
      parentId: epicId,
      parentKey: null,
      baseLabels
    }));

    for (const task of model.subtasks.filter((candidate) => candidate.parentStoryId === story.id)) {
      const taskDocument = buildTicketDocument(model, task.id);
      nodes.push(createNode({
        id: task.id,
        stateDir,
        projectKey: config.projectKey,
        issueType: 'Subtask',
        summary: taskDocument.summary,
        description: taskDocument.markdown,
        parentId: story.id,
        parentKey: null,
        baseLabels
      }));
    }
  }

  return { featureSlug, stateDir, siteUrl: config.siteUrl, nodes, warnings };
};
