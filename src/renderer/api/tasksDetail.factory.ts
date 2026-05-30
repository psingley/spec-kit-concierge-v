import { invalid, isStringArray, requireExactKeys, requireRecord, requireString, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidTasksDetail';

export type ParsedTask = {
  id: string;
  title: string;
  phase?: string;
  dependencies: string[];
  files: string[];
  acceptance?: string;
};

export type RendererTasksDetail = { tasks: ParsedTask[] };

const parseTask = (
  value: unknown,
  path: string
): RendererFactoryResult<ParsedTask, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidTasksDetail', path);
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['id', 'title', 'phase', 'dependencies', 'files', 'acceptance']);
  if (!keys.ok) return keys;
  const id = requireString(root.value.id, 'InvalidTasksDetail', `${path}.id`);
  const title = requireString(root.value.title, 'InvalidTasksDetail', `${path}.title`);
  if (!id.ok) return id;
  if (!title.ok) return title;
  if (root.value.phase !== undefined && typeof root.value.phase !== 'string') {
    return invalid('InvalidTasksDetail', 'must be a string when present', `${path}.phase`);
  }
  if (!isStringArray(root.value.dependencies)) {
    return invalid('InvalidTasksDetail', 'must be a string array', `${path}.dependencies`);
  }
  if (!isStringArray(root.value.files)) {
    return invalid('InvalidTasksDetail', 'must be a string array', `${path}.files`);
  }
  if (root.value.acceptance !== undefined && typeof root.value.acceptance !== 'string') {
    return invalid('InvalidTasksDetail', 'must be a string when present', `${path}.acceptance`);
  }
  return {
    ok: true,
    value: {
      id: id.value,
      title: title.value,
      phase: root.value.phase,
      dependencies: root.value.dependencies,
      files: root.value.files,
      acceptance: root.value.acceptance
    }
  };
};

export const parseRendererTasksDetail = (
  value: unknown
): RendererFactoryResult<RendererTasksDetail, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidTasksDetail', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['tasks']);
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.tasks)) {
    return invalid('InvalidTasksDetail', 'must be an array', '$.tasks');
  }
  const tasks: ParsedTask[] = [];
  for (const [index, task] of root.value.tasks.entries()) {
    const parsed = parseTask(task, `$.tasks[${index}]`);
    if (!parsed.ok) return parsed;
    tasks.push(parsed.value);
  }
  return { ok: true, value: { tasks } };
};
