import { constants } from 'node:fs';
import { access, mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { appendAnomalyRecord, appendInterventionRecord, appendStepAttempt as appendStepAttemptRecord } from '../../domain/manifest/sessionManifestReducer';
import { createSessionManifest } from '../../domain/manifest/sessionManifest.factory';
import type { Anomaly, Intervention, SessionManifestV1, StepAttempt } from '../../domain/manifest/types';
import { logHybridManifestEvent, type HybridManifestLogger } from '../../logging/hybridManifest.logging';

export type SessionManifestStoreErrorCode =
  | 'parse-error'
  | 'invalid-manifest'
  | 'invalid-mutation'
  | 'short-write';

export class SessionManifestStoreError extends Error {
  readonly code: SessionManifestStoreErrorCode;
  readonly cause?: unknown;

  constructor(code: SessionManifestStoreErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'SessionManifestStoreError';
    this.code = code;
    this.cause = cause;
  }
}

type StoreFileHandle = {
  writeFile?: (contents: string, options: { encoding: BufferEncoding }) => Promise<void>;
  sync: () => Promise<void>;
  close: () => Promise<void>;
  stat?: () => Promise<{ size: number }>;
};

type StoreFs = {
  mkdir?: typeof mkdir;
  readFile?: typeof readFile;
  open?: (targetPath: string, flags: string) => Promise<StoreFileHandle>;
  rename?: typeof rename;
  rm?: typeof rm;
  stat?: typeof stat;
  access?: typeof access;
};

export type ManifestStoreOptions = {
  repositoryPath: string;
  fs?: StoreFs;
  logger?: HybridManifestLogger;
};

export type CreateOrLoadManifestRequest = ManifestStoreOptions & {
  manifest: SessionManifestV1;
};

export type LoadManifestRequest = ManifestStoreOptions;

export type AppendStepAttemptRequest = ManifestStoreOptions & {
  attempt: StepAttempt;
};

export type AppendAnomalyRequest = ManifestStoreOptions & {
  anomaly: Anomaly;
};

export type AppendInterventionRequest = ManifestStoreOptions & {
  intervention: Intervention;
};

const manifestDirectory = (repositoryPath: string): string =>
  path.join(repositoryPath, '.concierge');

export const manifestFilePath = (repositoryPath: string): string =>
  path.join(manifestDirectory(repositoryPath), 'session-manifest.json');

const tempManifestFilePath = (repositoryPath: string): string =>
  path.join(
    manifestDirectory(repositoryPath),
    `.session-manifest.json.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );

const serializeManifest = (manifest: SessionManifestV1): string =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const parseManifest = (contents: string): SessionManifestV1 => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new SessionManifestStoreError('parse-error', 'session manifest contains invalid JSON', error);
  }

  const manifest = createSessionManifest(parsed);
  if (!manifest.ok) {
    throw new SessionManifestStoreError(
      'invalid-manifest',
      `session manifest failed schema validation at ${manifest.error.path}`,
      manifest.error
    );
  }

  return manifest.value;
};

const ensureFullWrite = async (
  tempPath: string,
  expectedBytes: number,
  handle: StoreFileHandle,
  fs: StoreFs
): Promise<void> => {
  const actual = handle.stat === undefined
    ? await (fs.stat ?? stat)(tempPath)
    : await handle.stat();

  if (actual.size !== expectedBytes) {
    throw new SessionManifestStoreError(
      'short-write',
      `session manifest short write: expected ${expectedBytes} bytes, wrote ${actual.size} bytes`
    );
  }
};

const syncDirectory = async (directoryPath: string, fs: StoreFs): Promise<void> => {
  const openFile = fs.open ?? open;
  let handle: StoreFileHandle | undefined;

  try {
    handle = await openFile(directoryPath, 'r');
    await handle.sync();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EISDIR' && code !== 'EINVAL' && code !== 'ENOTSUP' && code !== 'ENOSYS' && code !== 'EPERM') {
      throw error;
    }
  } finally {
    await handle?.close();
  }
};

export const writeManifest = async (
  manifest: SessionManifestV1,
  options: ManifestStoreOptions
): Promise<void> => {
  const fs = options.fs ?? {};
  const directoryPath = manifestDirectory(options.repositoryPath);
  const targetPath = manifestFilePath(options.repositoryPath);
  const tempPath = tempManifestFilePath(options.repositoryPath);
  const contents = serializeManifest(manifest);
  const openFile = fs.open ?? open;

  await (fs.mkdir ?? mkdir)(directoryPath, { recursive: true });

  let handle: StoreFileHandle | undefined;
  try {
    handle = await openFile(tempPath, 'w');
    if (handle.writeFile === undefined) {
      throw new SessionManifestStoreError('short-write', 'session manifest file handle cannot write');
    }
    await handle.writeFile(contents, { encoding: 'utf8' });
    await ensureFullWrite(tempPath, Buffer.byteLength(contents, 'utf8'), handle, fs);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await (fs.rename ?? rename)(tempPath, targetPath);
    await syncDirectory(directoryPath, fs);
    logHybridManifestEvent(options.logger, 'session-manifest-write', {
      manifestPath: targetPath,
      sessionId: manifest.sessionId,
      currentStep: manifest.currentStep,
      updatedAt: manifest.updatedAt
    });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await (fs.rm ?? rm)(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

export const loadManifest = async (
  request: LoadManifestRequest
): Promise<SessionManifestV1> => {
  const fs = request.fs ?? {};
  const contents = await (fs.readFile ?? readFile)(manifestFilePath(request.repositoryPath), 'utf8');
  const manifest = parseManifest(contents);
  logHybridManifestEvent(request.logger, 'session-manifest-read', {
    manifestPath: manifestFilePath(request.repositoryPath),
    sessionId: manifest.sessionId,
    currentStep: manifest.currentStep,
    updatedAt: manifest.updatedAt
  });
  return manifest;
};

export const createOrLoadManifest = async (
  request: CreateOrLoadManifestRequest
): Promise<SessionManifestV1> => {
  const fs = request.fs ?? {};
  const targetPath = manifestFilePath(request.repositoryPath);

  try {
    await (fs.access ?? access)(targetPath, constants.F_OK);
    return await loadManifest(request);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await writeManifest(request.manifest, request);
  return request.manifest;
};

export const appendStepAttempt = async (
  request: AppendStepAttemptRequest
): Promise<SessionManifestV1> => {
  const manifest = await loadManifest(request);
  const next = appendStepAttemptRecord(manifest, request.attempt);
  if (!next.ok) {
    throw new SessionManifestStoreError('invalid-mutation', next.error.message, next.error);
  }
  await writeManifest(next.value, request);
  return next.value;
};

export const appendAnomaly = async (
  request: AppendAnomalyRequest
): Promise<SessionManifestV1> => {
  const manifest = await loadManifest(request);
  const next = appendAnomalyRecord(manifest, request.anomaly);
  if (!next.ok) {
    throw new SessionManifestStoreError('invalid-mutation', next.error.message, next.error);
  }
  await writeManifest(next.value, request);
  logHybridManifestEvent(request.logger, 'manifest-anomaly-recorded', {
    manifestPath: manifestFilePath(request.repositoryPath),
    sessionId: next.value.sessionId,
    anomalyId: request.anomaly.anomalyId,
    step: request.anomaly.step,
    kind: request.anomaly.kind,
    severity: request.anomaly.severity
  });
  return next.value;
};

export const appendIntervention = async (
  request: AppendInterventionRequest
): Promise<SessionManifestV1> => {
  const manifest = await loadManifest(request);
  const next = appendInterventionRecord(manifest, request.intervention);
  if (!next.ok) {
    throw new SessionManifestStoreError('invalid-mutation', next.error.message, next.error);
  }
  await writeManifest(next.value, request);
  logHybridManifestEvent(request.logger, 'manifest-intervention-recorded', {
    manifestPath: manifestFilePath(request.repositoryPath),
    sessionId: next.value.sessionId,
    interventionId: request.intervention.interventionId,
    anomalyId: request.intervention.anomalyId,
    tool: request.intervention.tool,
    result: request.intervention.result
  });
  return next.value;
};
