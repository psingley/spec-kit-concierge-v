import type { IpcMain } from 'electron';
import type { MainLogger } from '../logging';
import { assertOnePayload, getSenderContext } from './handlerUtils';
import { SESSION_MANIFEST_CHANNELS } from './sessionManifest.channels';
import {
  createSessionManifestAuditRequest,
  createSessionManifestDoctorStatusRequest,
  createSessionManifestNudgeRequest,
  createSessionManifestReadRequest,
  createSessionManifestReconcileRequest,
  type SessionManifestBoundaryRequest
} from './sessionManifest.factory';

export type SessionManifestDataLayer = {
  read: (request: SessionManifestBoundaryRequest) => Promise<unknown>;
  reconcile: (request: SessionManifestBoundaryRequest) => Promise<unknown>;
  auditTrail: (request: SessionManifestBoundaryRequest) => Promise<unknown>;
  doctorStatus: (request: SessionManifestBoundaryRequest) => Promise<unknown>;
  nudge: (request: SessionManifestBoundaryRequest) => Promise<unknown>;
};

export type RegisterSessionManifestIpcOptions = {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<MainLogger, 'info' | 'error'>;
  dataLayer: SessionManifestDataLayer;
};

const register = (
  options: RegisterSessionManifestIpcOptions,
  channel: string,
  parse: (value: unknown) => ReturnType<typeof createSessionManifestReadRequest>,
  handle: (request: SessionManifestBoundaryRequest) => Promise<unknown>
): void => {
  options.ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    const context = getSenderContext(event);
    const parsed = parse(assertOnePayload(channel, args));
    if (!parsed.ok) {
      options.logger.error({ event: 'manifest-handler', channel, context, success: false, error: parsed.error }, 'ipc handler invocation');
      throw new Error(parsed.error.message);
    }
    const result = await handle(parsed.value);
    options.logger.info({ event: 'manifest-handler', channel, context, success: true }, 'ipc handler invocation');
    return result;
  });
};

export const registerSessionManifestIpc = (options: RegisterSessionManifestIpcOptions): void => {
  register(options, SESSION_MANIFEST_CHANNELS.read, createSessionManifestReadRequest, options.dataLayer.read);
  register(options, SESSION_MANIFEST_CHANNELS.reconcile, createSessionManifestReconcileRequest, options.dataLayer.reconcile);
  register(options, SESSION_MANIFEST_CHANNELS.auditTrail, createSessionManifestAuditRequest, options.dataLayer.auditTrail);
  register(options, SESSION_MANIFEST_CHANNELS.doctorStatus, createSessionManifestDoctorStatusRequest, options.dataLayer.doctorStatus);
  register(options, SESSION_MANIFEST_CHANNELS.nudge, createSessionManifestNudgeRequest, options.dataLayer.nudge);
};
