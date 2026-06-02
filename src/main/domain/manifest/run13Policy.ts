export const RUN13_POLICY = {
  featureDir: 'specs/0013-hybrid-manifest-architecture',
  dogfoodBranch: 'build/manifest-architecture-dogfood',
  manifestPath: '.concierge/session-manifest.json',
  printModeCommand: 'copilot',
  printModeArgsPrefix: ['-p', '--agent'] as const,
  outputFormatArgs: ['--output-format', 'json'] as const,
  sessionIdArg: '--session-id',
  logDirArg: '--log-dir',
  maxDoctorAttemptsPerStep: 2,
  safeRecoveryTargetPercent: 90,
  resumeReconstructionTargetPercent: 99,
  noRuntimeDependenciesAdded: true,
  acpRetiredForStepExecutionOnly: true,
  deterministicCodeOnlyWritesAuthority: true
} as const;

export const createRun13PrintModeArgs = (
  step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review',
  sessionId: string,
  logDir: string
): ['-p', '--agent', `speckit.${typeof step}`, '--output-format', 'json', '--session-id', string, '--log-dir', string] => [
  '-p',
  '--agent',
  `speckit.${step}`,
  '--output-format',
  'json',
  '--session-id',
  sessionId,
  '--log-dir',
  logDir
];
