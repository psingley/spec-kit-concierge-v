import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runGit } from '../git/gitCommand';
import { findExplicitProjectKey } from './jiraConfigYaml';

export type JiraBoardMapping = {
  projectKey?: string;
  source: 'user' | 'seed' | 'none';
};

type MappingFile = {
  mappings: Record<string, string>;
  aliases: Record<string, string>;
};

export type JiraBoardMappingService = {
  getBoard: (repositoryPath: string) => Promise<JiraBoardMapping>;
  setBoard: (repositoryPath: string, projectKey: string) => Promise<void>;
  isConfigured: (repositoryPath: string) => Promise<boolean>;
  readRawForTest: () => Promise<string>;
};

const mappingFilePath = (userDataPath: string): string =>
  path.join(userDataPath, 'jira-board-mappings.json');

const emptyFile = (): MappingFile => ({ mappings: {}, aliases: {} });

const normalizePathKey = (repositoryPath: string): string => path.normalize(repositoryPath);

const parseRemoteOwnerRepo = (remote: string): string | undefined => {
  const trimmed = remote.trim().replace(/\.git$/, '');
  const ssh = trimmed.match(/^[^@]+@[^:]+:([^/]+\/[^/]+)$/);
  const https = trimmed.match(/^https?:\/\/[^/]+\/([^/]+\/[^/]+)$/);
  const match = ssh ?? https;
  return match?.[1]?.toLowerCase();
};

const readFileJson = async (userDataPath: string): Promise<MappingFile> => {
  try {
    return JSON.parse(await readFile(mappingFilePath(userDataPath), 'utf8')) as MappingFile;
  } catch {
    return emptyFile();
  }
};

const writeFileJson = async (userDataPath: string, file: MappingFile): Promise<void> => {
  await mkdir(userDataPath, { recursive: true });
  await writeFile(mappingFilePath(userDataPath), JSON.stringify(file, null, 2), 'utf8');
};

const resolveRepositoryKey = async (repositoryPath: string): Promise<string> => {
  try {
    const remote = await runGit(repositoryPath, ['remote', 'get-url', 'origin']);
    return parseRemoteOwnerRepo(remote) ?? normalizePathKey(repositoryPath);
  } catch {
    return normalizePathKey(repositoryPath);
  }
};

export const parseExplicitJiraProjectKey = (raw: string): string | undefined =>
  findExplicitProjectKey(raw);

const readSeedProjectKey = async (repositoryPath: string): Promise<string | undefined> => {
  try {
    const raw = await readFile(path.join(repositoryPath, '.specify', 'extensions', 'concierge-jira', 'jira-config.yml'), 'utf8');
    return parseExplicitJiraProjectKey(raw);
  } catch {
    return undefined;
  }
};

export const createJiraBoardMappingService = ({ userDataPath }: { userDataPath: string }): JiraBoardMappingService => ({
  getBoard: async (repositoryPath) => {
    const key = await resolveRepositoryKey(repositoryPath);
    const file = await readFileJson(userDataPath);
    const mapped = file.mappings[key];
    if (mapped !== undefined) return { projectKey: mapped, source: 'user' };
    const seed = await readSeedProjectKey(repositoryPath);
    return seed === undefined ? { projectKey: undefined, source: 'none' } : { projectKey: seed, source: 'seed' };
  },
  setBoard: async (repositoryPath, projectKey) => {
    const key = await resolveRepositoryKey(repositoryPath);
    const file = await readFileJson(userDataPath);
    file.mappings[key] = projectKey.trim().toUpperCase();
    file.aliases[normalizePathKey(repositoryPath)] = key;
    await writeFileJson(userDataPath, file);
  },
  isConfigured: async (repositoryPath) => {
    const board = await createJiraBoardMappingService({ userDataPath }).getBoard(repositoryPath);
    return board.source !== 'none' && board.projectKey !== undefined;
  },
  readRawForTest: async () => readFile(mappingFilePath(userDataPath), 'utf8')
});
