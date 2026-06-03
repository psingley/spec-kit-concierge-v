export type JiraAcceptanceScenario = {
  given: string;
  when: string;
  then: string;
};

export type JiraEpicModel = {
  id: string;
  title: string;
  keyOutcomes: Array<{ title: string; why: string }>;
  scope: string[];
  acceptanceHighlights: string[];
};

export type JiraStoryModel = {
  id: string;
  phaseHeading: string;
  summary: string;
  goal: string;
  userStoryNumber: number | null;
  userStorySentence: string;
  priority: string;
  why: string;
  independentTest: string;
  acceptanceScenarios: JiraAcceptanceScenario[];
  childTaskIds: string[];
};

export type JiraSubtaskModel = {
  id: string;
  taskId: string;
  parentStoryId: string;
  rawLine: string;
  prose: string;
  affectedFiles: string[];
  doneWhen: string[];
};

export type JiraTicketModel = {
  epic: JiraEpicModel;
  stories: JiraStoryModel[];
  subtasks: JiraSubtaskModel[];
  warnings: string[];
};

export type ParseJiraTicketModelRequest = {
  featureSlug: string;
  specMarkdown: string;
  tasksMarkdown: string;
};

type ParsedUserStory = {
  number: number;
  title: string;
  priority: string;
  sentence: string;
  why: string;
  independentTest: string;
  acceptanceScenarios: JiraAcceptanceScenario[];
};

const taskPattern = /^-\s+\[[ xX]\]\s+(T\d{3,}[a-z]?)\s+(.+)$/;
const phaseHeadingPattern = /^##\s+(Phase\s+\d+.*)$/i;

export const stripBuildTags = (value: string): string =>
  value.replace(/\[(?:P|US\d+)\]/gi, ' ').replace(/[ \t]{2,}/g, ' ').trim();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const uniqueId = (base: string, seen: Map<string, number>): string => {
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
};

const normalizeHeadingText = (value: string): string =>
  value
    .replace(/^#+\s*/, '')
    .replace(/\s+\*\([^)]*\)\*\s*$/g, '')
    .replace(/[.:;,\s]+$/g, '')
    .trim()
    .toLowerCase();

const sectionLines = (markdown: string, heading: string): string[] => {
  const lines = markdown.split(/\r?\n/);
  const normalizedHeading = normalizeHeadingText(heading);
  const start = lines.findIndex((line) => normalizeHeadingText(line) === normalizedHeading);
  if (start < 0) return [];
  const body: string[] = [];
  const sourceLevel = lines[start]?.match(/^(#+)\s+/)?.[1]?.length ?? 2;
  for (const line of lines.slice(start + 1)) {
    const headingMatch = line.match(/^(#+)\s+/);
    if (headingMatch !== null && headingMatch[1]!.length <= sourceLevel) break;
    body.push(line);
  }
  return body;
};

const firstHeading = (markdown: string): string =>
  markdown.split(/\r?\n/).find((line) => line.startsWith('# '))?.replace(/^#\s+/, '').trim() || 'Spec-kit feature';

const cleanPhaseSummary = (heading: string): string =>
  heading.replace(/^Phase\s+\d+\s*(?::|-|—)\s*/i, '').trim() || heading.trim();

const extractFunctionalRequirements = (specMarkdown: string): string[] => {
  const requirementLines = sectionLines(specMarkdown, 'Functional Requirements');
  const lines = requirementLines.length > 0 ? requirementLines : sectionLines(specMarkdown, 'Requirements');
  return lines
    .map((line) => line.trim())
    .filter((line) => /^-\s+\*\*FR-\d+/i.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());
};

const extractSuccessCriteria = (specMarkdown: string): string[] =>
  sectionLines(specMarkdown, 'Success Criteria')
    .map((line) => line.trim())
    .filter((line) => /^-\s+\*\*SC-\d+/i.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());

const parseAcceptanceScenario = (line: string): JiraAcceptanceScenario | null => {
  const match = line.match(/^\d+\.\s+\*\*Given\*\*\s+(.+?),\s+\*\*When\*\*\s+(.+?),\s+\*\*Then\*\*\s+(.+)$/i);
  if (match === null) return null;
  return {
    given: match[1]!.trim(),
    when: match[2]!.trim(),
    then: match[3]!.trim()
  };
};

const parseUserStories = (specMarkdown: string): ParsedUserStory[] => {
  const lines = specMarkdown.split(/\r?\n/);
  const stories: ParsedUserStory[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]?.match(/^###\s+User Story\s+(\d+)\s+-\s+(.+?)(?:\s+\(Priority:\s*([^)]+)\))?\s*$/i);
    if (heading == null) continue;
    const storyNumber = heading[1];
    const storyTitle = heading[2];
    const priority = heading[3]?.trim() ?? '';
    if (storyNumber === undefined || storyTitle === undefined) continue;
    const body: string[] = [];
    for (const line of lines.slice(index + 1)) {
      if (/^###\s+/.test(line)) break;
      body.push(line);
    }
    const sentence = body.map((line) => line.trim()).find((line) => /^As\s+/i.test(line)) ?? '';
    const why = body.find((line) => /^\*\*Why this priority\*\*:/i.test(line))?.replace(/^\*\*Why this priority\*\*:\s*/i, '').trim() ?? '';
    const independentTest = body.find((line) => /^\*\*Independent Test\*\*:/i.test(line))?.replace(/^\*\*Independent Test\*\*:\s*/i, '').trim() ?? '';
    const acceptanceScenarios = body.map((line) => parseAcceptanceScenario(line.trim())).filter((scenario): scenario is JiraAcceptanceScenario => scenario !== null);
    stories.push({
      number: Number(storyNumber),
      title: storyTitle.trim(),
      priority,
      sentence,
      why,
      independentTest,
      acceptanceScenarios
    });
  }
  return stories;
};

const extractUserStoryTag = (line: string): number | null => {
  const match = line.match(/\[US(\d+)\]/i);
  return match === null ? null : Number(match[1]);
};

const extractUserStoryFromHeading = (heading: string): number | null => {
  if (/\b(?:setup|foundational|polish)\b/i.test(heading)) return null;
  const match = heading.match(/\bUser Story\s+(\d+)\b/i);
  return match === null ? null : Number(match[1]);
};

const extractAffectedFiles = (text: string): string[] => {
  const files: string[] = [];
  const add = (value: string): void => {
    const cleaned = value.replace(/^[("']+|[)"'.,;:]+$/g, '');
    if (/[/\\]/.test(cleaned) && !files.includes(cleaned)) {
      files.push(cleaned);
    }
  };
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    add(match[1]!);
  }
  const withoutCode = text.replace(/`[^`]+`/g, ' ');
  for (const match of withoutCode.matchAll(/(?:\.?[A-Za-z0-9_-]+\/)+[A-Za-z0-9_.-]+/g)) {
    add(match[0]);
  }
  return files;
};

const doneWhenFor = (taskId: string, story: ParsedUserStory | undefined): string[] => {
  if (story?.acceptanceScenarios.length) {
    return story.acceptanceScenarios.map((scenario) => `${scenario.given} -> ${scenario.when} -> ${scenario.then}`);
  }
  return [`Task ${taskId} is implemented and its acceptance notes pass`];
};

export const parseJiraTicketModel = ({
  featureSlug,
  specMarkdown,
  tasksMarkdown
}: ParseJiraTicketModelRequest): JiraTicketModel => {
  const title = firstHeading(specMarkdown);
  const parsedStories = parseUserStories(specMarkdown);
  const storiesByNumber = new Map(parsedStories.map((story) => [story.number, story]));
  const scope = extractFunctionalRequirements(specMarkdown);
  const acceptanceHighlights = [
    ...extractSuccessCriteria(specMarkdown),
    ...parsedStories.flatMap((story) => story.acceptanceScenarios.slice(0, 1).map((scenario) => `US${story.number}: ${scenario.given} -> ${scenario.when} -> ${scenario.then}`))
  ];
  const warnings: string[] = [];
  const seenIds = new Map<string, number>();
  const stories: JiraStoryModel[] = [];
  const subtasks: JiraSubtaskModel[] = [];
  let currentStory: JiraStoryModel | null = null;
  let currentStorySource: ParsedUserStory | undefined;

  for (const rawLine of tasksMarkdown.split(/\r?\n/)) {
    const phaseHeading = rawLine.match(phaseHeadingPattern)?.[1]?.trim();
    if (phaseHeading !== undefined) {
      const userStoryNumber = extractUserStoryFromHeading(phaseHeading);
      currentStorySource = userStoryNumber === null ? undefined : storiesByNumber.get(userStoryNumber);
      const summary = cleanPhaseSummary(phaseHeading);
      const storyId = uniqueId(`${featureSlug}-${slugify(phaseHeading)}`, seenIds);
      currentStory = {
        id: storyId,
        phaseHeading,
        summary,
        goal: currentStorySource?.title ?? summary,
        userStoryNumber,
        userStorySentence: currentStorySource?.sentence ?? '',
        priority: currentStorySource?.priority ?? '',
        why: currentStorySource?.why ?? '',
        independentTest: currentStorySource?.independentTest ?? '',
        acceptanceScenarios: currentStorySource?.acceptanceScenarios ?? [],
        childTaskIds: []
      };
      stories.push(currentStory);
      continue;
    }

    const task = rawLine.match(taskPattern);
    if (task === null) continue;
    if (currentStory === null) {
      const storyId = uniqueId(`${featureSlug}-phase-0-unassigned`, seenIds);
      currentStory = {
        id: storyId,
        phaseHeading: 'Phase 0: Unassigned',
        summary: 'Unassigned',
        goal: 'Unassigned',
        userStoryNumber: null,
        userStorySentence: '',
        priority: '',
        why: '',
        independentTest: '',
        acceptanceScenarios: [],
        childTaskIds: []
      };
      currentStorySource = undefined;
      stories.push(currentStory);
      warnings.push('Tasks were found before any Phase heading.');
    }
    const taskId = task[1]!;
    const explicitStoryNumber = extractUserStoryTag(rawLine);
    const sourceStory = explicitStoryNumber === null ? currentStorySource : storiesByNumber.get(explicitStoryNumber);
    const prose = stripBuildTags(task[2] ?? '');
    const subtaskId = uniqueId(`${featureSlug}-${taskId}`, seenIds);
    currentStory.childTaskIds.push(subtaskId);
    subtasks.push({
      id: subtaskId,
      taskId,
      parentStoryId: currentStory.id,
      rawLine,
      prose,
      affectedFiles: extractAffectedFiles(prose),
      doneWhen: doneWhenFor(taskId, sourceStory)
    });
  }

  if (stories.length === 0) {
    warnings.push('No Phase headings with T### tasks were found in tasks.md.');
  }

  return {
    epic: {
      id: `${featureSlug}-epic`,
      title,
      keyOutcomes: parsedStories.map((story) => ({ title: story.title, why: story.why })),
      scope,
      acceptanceHighlights
    },
    stories,
    subtasks,
    warnings
  };
};
