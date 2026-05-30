import { invalid, isStringArray, requireExactKeys, requireRecord, requireString, type FactoryResult } from './factoryUtils';
import type { ParsedTask } from '../domain/tasksDetail';

type ErrorName = 'InvalidTasksDetailPayload';

export type TasksDetailRequest = { repositoryPath: string; artifactPath: string };
export type TasksDetailResponse = { tasks: ParsedTask[] };

const safeRelativePath = (value: string): boolean =>
  value.length > 0 && !value.startsWith('/') && !value.includes('..') && !value.includes('\\');

const isTasksArtifactPath = (value: string): boolean => value.endsWith('tasks.md');

const requireTaskKeys = (value: Record<string, unknown>, path: string): FactoryResult<void, ErrorName> => {
  const allowed = new Set(['id', 'title', 'phase', 'dependencies', 'files', 'acceptance']);
  const extraKey = Object.keys(value).find((key) => !allowed.has(key));
  if (extraKey !== undefined) {
    return invalid('InvalidTasksDetailPayload', 'payload contains an unexpected key', `${path}.${extraKey}`);
  }
  for (const key of ['id', 'title', 'dependencies', 'files']) {
    if (!(key in value)) {
      return invalid('InvalidTasksDetailPayload', 'payload is missing a required key', `${path}.${key}`);
    }
  }
  return { ok: true, value: undefined };
};

const createParsedTask = (value: unknown, path: string): FactoryResult<ParsedTask, ErrorName> => {
  const root = requireRecord(value, 'InvalidTasksDetailPayload', path);
  if (!root.ok) return root;
  const keys = requireTaskKeys(root.value, path);
  if (!keys.ok) return keys;
  const id = requireString(root.value.id, 'InvalidTasksDetailPayload', `${path}.id`);
  const title = requireString(root.value.title, 'InvalidTasksDetailPayload', `${path}.title`);
  if (!id.ok) return id;
  if (!title.ok) return title;
  if (root.value.phase !== undefined && typeof root.value.phase !== 'string') {
    return invalid('InvalidTasksDetailPayload', 'must be a string when present', `${path}.phase`);
  }
  if (!isStringArray(root.value.dependencies)) {
    return invalid('InvalidTasksDetailPayload', 'must be a string array', `${path}.dependencies`);
  }
  if (!isStringArray(root.value.files)) {
    return invalid('InvalidTasksDetailPayload', 'must be a string array', `${path}.files`);
  }
  if (root.value.acceptance !== undefined && typeof root.value.acceptance !== 'string') {
    return invalid('InvalidTasksDetailPayload', 'must be a string when present', `${path}.acceptance`);
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

export const createTasksDetailRequest = (value: unknown): FactoryResult<TasksDetailRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidTasksDetailPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['repositoryPath', 'artifactPath'], 'InvalidTasksDetailPayload', '$');
  if (!keys.ok) return keys;
  const repositoryPath = requireString(root.value.repositoryPath, 'InvalidTasksDetailPayload', '$.repositoryPath');
  const artifactPath = requireString(root.value.artifactPath, 'InvalidTasksDetailPayload', '$.artifactPath');
  if (!repositoryPath.ok) return repositoryPath;
  if (!artifactPath.ok) return artifactPath;
  if (!safeRelativePath(artifactPath.value)) {
    return invalid('InvalidTasksDetailPayload', 'artifactPath must be a safe relative path', '$.artifactPath');
  }
  if (!isTasksArtifactPath(artifactPath.value)) {
    return invalid('InvalidTasksDetailPayload', 'artifactPath must point to tasks.md', '$.artifactPath');
  }
  return { ok: true, value: { repositoryPath: repositoryPath.value, artifactPath: artifactPath.value } };
};

export const createTasksDetailResponse = (value: unknown): FactoryResult<TasksDetailResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidTasksDetailPayload', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys(root.value, ['tasks'], 'InvalidTasksDetailPayload', '$');
  if (!keys.ok) return keys;
  if (!Array.isArray(root.value.tasks)) {
    return invalid('InvalidTasksDetailPayload', 'must be an array', '$.tasks');
  }
  const tasks: ParsedTask[] = [];
  for (const [index, task] of root.value.tasks.entries()) {
    const parsed = createParsedTask(task, `$.tasks[${index}]`);
    if (!parsed.ok) return parsed;
    tasks.push(parsed.value);
  }
  return { ok: true, value: { tasks } };
};
