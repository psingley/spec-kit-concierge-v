import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MainLogger } from '../logging';
import { STEP_ARTIFACT_MANIFEST, STEP_NAMES, type StepName } from './manifest';
import { lifecycleEvent, type StepLifecycleEvent } from './types';

export type DriftVerifierOptions = {
  agentsDirectory: string;
  logger: Pick<MainLogger, 'warn'>;
  activitySink?: (event: StepLifecycleEvent & { declaredOutputs?: string[]; expectedOutputs?: string[] }) => void;
};

export type AgentOutputDeclaration = {
  step: StepName;
  outputs: string[];
  ambiguous: boolean;
};

const stepFromFileName = (fileName: string): StepName | undefined => {
  const match = /^speckit\.([^.]+)\.agent\.md$/.exec(fileName);
  const candidate = match?.[1];
  return STEP_NAMES.find((step) => step === candidate);
};

const extractFrontmatterOutputs = (contents: string): string[] => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(contents);
  if (match === null) {
    return [];
  }
  const body = match[1] ?? '';
  const outputsLine = body.split(/\r?\n/).find((line) => /^outputs\s*:/.test(line.trim()));
  if (outputsLine === undefined) {
    return [];
  }
  return outputsLine
    .replace(/^outputs\s*:\s*/, '')
    .split(',')
    .map((output) => output.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
};

const extractSectionOutputs = (contents: string): string[] => {
  const match = /(?:^|\n)##\s+Outputs\s*\n([\s\S]*?)(?:\n##\s+|\s*$)/i.exec(contents);
  if (match === null) {
    return [];
  }
  return (match[1] ?? '')
    .split(/\r?\n/)
    .map((line) => /^[-*]\s+`?([^`\s]+)`?/.exec(line.trim())?.[1])
    .filter((output): output is string => output !== undefined);
};

export const parseAgentOutputs = (
  fileName: string,
  contents: string
): AgentOutputDeclaration | undefined => {
  const step = stepFromFileName(fileName);
  if (step === undefined) {
    return undefined;
  }
  const frontmatter = extractFrontmatterOutputs(contents);
  const section = extractSectionOutputs(contents);
  const outputs = [...new Set([...frontmatter, ...section])];

  return {
    step,
    outputs,
    ambiguous: frontmatter.length > 0 && section.length > 0 && frontmatter.join('|') !== section.join('|')
  };
};

export const verifyAgentManifestDrift = async ({
  agentsDirectory,
  logger,
  activitySink
}: DriftVerifierOptions): Promise<void> => {
  let files: string[];
  try {
    files = await readdir(agentsDirectory);
  } catch {
    return;
  }

  for (const file of files.filter((entry) => entry.endsWith('.agent.md'))) {
    const declaration = parseAgentOutputs(file, await readFile(path.join(agentsDirectory, file), 'utf8'));
    if (declaration === undefined) {
      continue;
    }
    const expectedOutputs = [
      ...STEP_ARTIFACT_MANIFEST[declaration.step].requiredFiles,
      ...STEP_ARTIFACT_MANIFEST[declaration.step].optionalFiles
    ];
    const mismatch =
      declaration.ambiguous ||
      declaration.outputs.length > 0 &&
        declaration.outputs.slice().sort().join('|') !== expectedOutputs.slice().sort().join('|');
    if (!mismatch) {
      continue;
    }
    const event = lifecycleEvent('agent-manifest-drift', declaration.step, { sessionId: 'startup' }, {
      reason: declaration.ambiguous ? 'ambiguous-output-declaration' : 'output-drift'
    });
    logger.warn({ ...event, declaredOutputs: declaration.outputs, expectedOutputs }, 'agent manifest drift');
    activitySink?.({ ...event, declaredOutputs: declaration.outputs, expectedOutputs });
  }
};
