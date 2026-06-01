import { invalid, requireExactKeys, requireRecord, type RendererBoundaryErrorName, type RendererFactoryResult } from './factoryUtils';

type ErrorName = 'InvalidResumeSession';

export type RendererResumeSession = {
  specMarkdown: string;
  specCommitSha: string | null;
};

export const parseRendererResumeSession = (
  value: unknown
): RendererFactoryResult<RendererResumeSession, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidResumeSession', '$');
  if (!root.ok) return root;
  const keys = requireExactKeys<ErrorName>(root.value, ['specMarkdown', 'specCommitSha']);
  if (!keys.ok) return keys;
  if (typeof root.value.specMarkdown !== 'string') {
    return invalid('InvalidResumeSession', 'specMarkdown must be a string', '$.specMarkdown');
  }
  const rawSha = root.value.specCommitSha;
  if (rawSha !== null && typeof rawSha !== 'string') {
    return invalid('InvalidResumeSession', 'specCommitSha must be a string or null', '$.specCommitSha');
  }
  return { ok: true, value: { specMarkdown: root.value.specMarkdown, specCommitSha: rawSha } };
};
