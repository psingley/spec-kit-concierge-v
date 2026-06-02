export const STEP_NAMES = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'] as const;

export type StepName = (typeof STEP_NAMES)[number];

export type StepArtifactManifestEntry = {
  requiredFiles: readonly string[];
  optionalFiles: readonly string[];
  remediationFiles?: readonly string[];
  contextFileException?: true;
  allowEmptyCommit?: true;
};

export type StepOwnedArtifact = {
  path: string;
  required: boolean;
  remediation?: true;
  contextFileException?: true;
};

export const STEP_ARTIFACT_MANIFEST = {
  specify: {
    requiredFiles: ['spec.md'],
    optionalFiles: ['checklists/requirements.md']
  },
  clarify: {
    requiredFiles: ['spec.md'],
    optionalFiles: []
  },
  plan: {
    requiredFiles: ['plan.md', 'research.md'],
    optionalFiles: ['data-model.md', 'quickstart.md', 'contracts/'],
    contextFileException: true
  },
  tasks: {
    requiredFiles: ['tasks.md'],
    optionalFiles: []
  },
  analyze: {
    requiredFiles: [],
    optionalFiles: [],
    remediationFiles: ['spec.md', 'plan.md', 'tasks.md'],
    allowEmptyCommit: true
  },
  review: {
    requiredFiles: [],
    optionalFiles: []
  }
} as const satisfies Record<StepName, StepArtifactManifestEntry>;

export const isStepName = (value: string): value is StepName =>
  (STEP_NAMES as readonly string[]).includes(value);

export const expectedArtifactsForStep = (
  step: StepName,
  contextFilePath?: string
): string[] => {
  const manifest = STEP_ARTIFACT_MANIFEST[step];
  const files: string[] = [
    ...manifest.requiredFiles,
    ...manifest.optionalFiles,
    ...(step === 'analyze' ? STEP_ARTIFACT_MANIFEST.analyze.remediationFiles : [])
  ];

  if (step === 'plan' && contextFilePath !== undefined) {
    files.push(contextFilePath);
  }

  return files;
};

export const ownedArtifactsForStep = (
  step: StepName,
  contextFilePath?: string
): StepOwnedArtifact[] => {
  const manifest = STEP_ARTIFACT_MANIFEST[step];
  const artifacts: StepOwnedArtifact[] = [
    ...manifest.requiredFiles.map((artifactPath) => ({ path: artifactPath, required: true })),
    ...manifest.optionalFiles.map((artifactPath) => ({ path: artifactPath, required: false })),
    ...((step === 'analyze' ? STEP_ARTIFACT_MANIFEST.analyze.remediationFiles : []) ?? [])
      .map((artifactPath) => ({ path: artifactPath, required: false, remediation: true as const }))
  ];

  if (step === 'plan' && contextFilePath !== undefined) {
    artifacts.push({
      path: contextFilePath,
      required: false,
      contextFileException: true
    });
  }

  return artifacts;
};
