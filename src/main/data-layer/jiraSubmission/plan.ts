import crypto from 'node:crypto';
import path from 'node:path';

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
  payloadHash: string;
  payload: JiraSubmissionPayload;
};

export type JiraSubmissionPlan = {
  featureSlug: string;
  stateDir: string;
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

type TaskLine = {
  id: string;
  title: string;
};

type Phase = {
  heading: string;
  tasks: TaskLine[];
};

const taskPattern = /-\s+\[[ xX]\]\s+(T\d{3,})\s+(.+)/;
const headingPattern = /^##\s+(.+)$/;

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

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const firstHeading = (markdown: string): string => {
  const heading = markdown.split(/\r?\n/).find((line) => line.startsWith('# '));
  return heading?.replace(/^#\s+/, '').trim() || 'Spec-kit feature';
};

const excerpt = (markdown: string, heading: string): string => {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading.trim());
  if (start < 0) {
    return '';
  }
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      break;
    }
    if (line.trim().length > 0) {
      body.push(line.trim());
    }
  }
  return body.join('\n');
};

const parsePhases = (tasksMarkdown: string): Phase[] => {
  const phases: Phase[] = [];
  for (const rawLine of tasksMarkdown.split(/\r?\n/)) {
    const heading = rawLine.match(headingPattern)?.[1]?.trim();
    if (heading !== undefined && /^Phase\s+\d+/i.test(heading)) {
      phases.push({ heading, tasks: [] });
      continue;
    }
    const task = rawLine.match(taskPattern);
    if (task !== null) {
      const phase = phases.at(-1) ?? { heading: 'Phase 0: Unassigned', tasks: [] };
      if (phases.length === 0) {
        phases.push(phase);
      }
      phase.tasks.push({ id: task[1]!, title: task[2]!.trim() });
    }
  }
  return phases;
};

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
  const payloadWithoutIdem: JiraSubmissionPayload = {
    idempotency_id: request.id,
    state_dir: request.stateDir,
    project_key: request.projectKey,
    issue_type: request.issueType,
    summary: request.summary,
    description: request.description,
    labels: [...request.baseLabels],
    parent_key: request.parentKey,
    relationship_field: null
  };
  const payloadHash = createPayloadHash(payloadWithoutIdem);
  const idemLabel = `${request.projectKey}-idem-${payloadHash.slice(0, 12)}`;
  const labels = [...request.baseLabels, idemLabel];

  return {
    id: request.id,
    issueType: request.issueType,
    parentId: request.parentId,
    summary: request.summary,
    description: request.description,
    labels,
    payloadHash,
    payload: { ...payloadWithoutIdem, labels }
  };
};

export const buildJiraSubmissionPlan = ({
  repositoryPath,
  featureDir,
  specMarkdown,
  tasksMarkdown,
  config
}: BuildJiraSubmissionPlanRequest): JiraSubmissionPlan => {
  const featureSlug = path.basename(featureDir);
  const stateDir = path.join(featureDir, 'jira-submission-state');
  const baseLabels = [...config.baseLabels, featureSlug].filter((label, index, labels) => labels.indexOf(label) === index);
  const warnings: string[] = [];
  const nodes: JiraSubmissionNode[] = [];
  const title = firstHeading(specMarkdown);
  const epicId = `${featureSlug}-epic`;

  nodes.push(createNode({
    id: epicId,
    stateDir,
    projectKey: config.projectKey,
    issueType: 'Epic',
    summary: title,
    description: [
      `Spec feature: ${title}`,
      '',
      'Rendered deterministically by Spec-kit Concierge.',
      '',
      excerpt(specMarkdown, '## Requirements') || specMarkdown.slice(0, 1600)
    ].join('\n'),
    parentId: null,
    parentKey: null,
    baseLabels
  }));

  const phases = parsePhases(tasksMarkdown);
  if (phases.length === 0) {
    warnings.push('No Phase headings with T### tasks were found in tasks.md.');
  }

  for (const phase of phases) {
    const phaseSlug = slugify(phase.heading);
    const phaseId = `${featureSlug}-${phaseSlug}`;
    nodes.push(createNode({
      id: phaseId,
      stateDir,
      projectKey: config.projectKey,
      issueType: 'Story',
      summary: phase.heading.replace(/^Phase\s+\d+:\s*/i, ''),
      description: [
        `Source phase: ${phase.heading}`,
        '',
        `Repository: ${repositoryPath}`,
        `Feature: ${featureSlug}`,
        '',
        `Tasks in phase: ${phase.tasks.map((task) => task.id).join(', ') || 'none'}`
      ].join('\n'),
      parentId: epicId,
      parentKey: null,
      baseLabels
    }));

    for (const task of phase.tasks) {
      nodes.push(createNode({
        id: `${featureSlug}-${task.id}`,
        stateDir,
        projectKey: config.projectKey,
        issueType: 'Subtask',
        summary: `${task.id} ${task.title}`,
        description: [
          `Source task: ${task.id}`,
          '',
          task.title,
          '',
          `Parent phase: ${phase.heading}`,
          `Feature: ${featureSlug}`
        ].join('\n'),
        parentId: phaseId,
        parentKey: null,
        baseLabels
      }));
    }
  }

  return { featureSlug, stateDir, nodes, warnings };
};
