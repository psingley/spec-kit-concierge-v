import type { JiraStoryModel, JiraSubtaskModel, JiraTicketModel } from './parser';

export type TicketDocument = {
  summary: string;
  markdown: string;
};

const clampSummary = (value: string): string =>
  value.length <= 255 ? value : `${value.slice(0, 254).trimEnd()}…`;

const clampAtWordBoundary = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  const limit = Math.max(0, maxLength - 3);
  const slice = value.slice(0, limit);
  const boundary = slice.lastIndexOf(' ');
  if (boundary <= 0) return `${slice}...`;
  return `${slice.slice(0, boundary + 1)}...`;
};

const titleFromProse = (task: JiraSubtaskModel): string => {
  const withoutCode = task.prose.replace(/`([^`]+)`/g, '$1');
  const firstSentence = withoutCode.split(/[.;]/)[0]?.trim() || task.prose;
  return firstSentence.replace(/\s+in\s+.+$/i, '').trim();
};

const buildSubtask = (model: JiraTicketModel, subtask: JiraSubtaskModel): TicketDocument => {
  const story = model.stories.find((candidate) => candidate.id === subtask.parentStoryId);
  const summaryPath = subtask.affectedFiles[0];
  const baseSummary = `${subtask.taskId} ${titleFromProse(subtask)}`;
  const summary = clampSummary(summaryPath !== undefined && !baseSummary.includes(summaryPath)
    ? `${baseSummary} in \`${summaryPath}\``
    : baseSummary);
  const affectedFiles = subtask.affectedFiles.length > 0
    ? subtask.affectedFiles.map((file) => `* \`${file}\``)
    : ['* No specific file path was named in the task line.'];
  const doneWhen = subtask.doneWhen.length > 0
    ? subtask.doneWhen.map((item) => `* ${item}`)
    : [`* Task ${subtask.taskId} is implemented and its acceptance notes pass`];
  return {
    summary,
    markdown: [
      `**Contributes to:** ${story?.goal || story?.summary || 'Feature implementation'}`,
      '',
      subtask.prose,
      '',
      '### Affected files',
      '',
      ...affectedFiles,
      '',
      '### Done when',
      '',
      ...doneWhen
    ].join('\n').trim()
  };
};

const acceptanceLine = (scenario: JiraStoryModel['acceptanceScenarios'][number]): string =>
  `* Given ${scenario.given}, when ${scenario.when}, then ${scenario.then}`;

const buildStory = (model: JiraTicketModel, story: JiraStoryModel): TicketDocument => {
  const children = model.subtasks.filter((subtask) => subtask.parentStoryId === story.id);
  const acceptanceCriteria = story.acceptanceScenarios.length > 0
    ? story.acceptanceScenarios.map(acceptanceLine)
    : ['* Acceptance details were not specified; validate the story goal and child task completion.'];
  const outline = children.length > 0
    ? children.map((subtask) => `* ${subtask.taskId} - ${titleFromProse(subtask)}`)
    : ['* No child tasks were listed for this phase.'];
  return {
    summary: clampSummary(story.summary),
    markdown: [
      story.userStorySentence || story.summary,
      '',
      '## Acceptance Criteria',
      '',
      ...acceptanceCriteria,
      '',
      `**Goal:** ${story.goal}`,
      '',
      `**Independent Test:** ${story.independentTest || 'Not specified in the source spec.'}`,
      '',
      '### Implementation outline',
      '',
      ...outline
    ].join('\n').trim()
  };
};

const buildEpic = (model: JiraTicketModel, maxMarkdownLength: number | undefined): TicketDocument => {
  const outcomes = model.epic.keyOutcomes.length > 0
    ? model.epic.keyOutcomes.map((outcome) => `* ${outcome.title}${outcome.why.length > 0 ? ` - ${outcome.why}` : ''}`)
    : [`* ${model.epic.title}`];
  const scope = model.epic.scope.length > 0
    ? model.epic.scope.map((item) => `* ${item}`)
    : ['* Source requirements were not specified; use the feature title and task breakdown as scope.'];
  const highlights = model.epic.acceptanceHighlights.length > 0
    ? model.epic.acceptanceHighlights.map((item) => `* ${item}`)
    : ['* No explicit success criteria or acceptance scenarios were specified.'];
  const markdown = [
    '## Key Outcomes',
    '',
    ...outcomes,
    '',
    '## Scope',
    '',
    ...scope,
    '',
    '## Acceptance highlights',
    '',
    ...highlights
  ].join('\n').trim();
  return {
    summary: clampSummary(model.epic.title),
    markdown: maxMarkdownLength === undefined ? markdown : clampAtWordBoundary(markdown, maxMarkdownLength)
  };
};

export const buildTicketDocument = (
  model: JiraTicketModel,
  nodeId: string,
  options: { maxMarkdownLength?: number } = {}
): TicketDocument => {
  if (nodeId === model.epic.id) {
    return buildEpic(model, options.maxMarkdownLength);
  }
  const story = model.stories.find((candidate) => candidate.id === nodeId);
  if (story !== undefined) {
    return buildStory(model, story);
  }
  const subtask = model.subtasks.find((candidate) => candidate.id === nodeId);
  if (subtask !== undefined) {
    return buildSubtask(model, subtask);
  }
  return { summary: 'Spec-kit ticket', markdown: 'Spec-kit ticket details were not available.' };
};
