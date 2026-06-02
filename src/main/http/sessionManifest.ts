import type { SessionManifestDataLayer } from '../ipc/sessionManifest';
import { SESSION_MANIFEST_HTTP_ROUTES, type SessionManifestHttpRoute } from './sessionManifest.routes';
import {
  createSessionManifestHttpAuditRequest,
  createSessionManifestHttpDoctorStatusRequest,
  createSessionManifestHttpReadRequest,
  createSessionManifestHttpReconcileRequest,
  type SessionManifestHttpBoundaryRequest
} from './sessionManifest.factory';

export type SessionManifestHttpResponse = {
  status: number;
  body: unknown;
};

export type SessionManifestHttpHandlers = Record<SessionManifestHttpRoute, (payload: unknown) => Promise<SessionManifestHttpResponse>>;

export type CreateSessionManifestHttpHandlersOptions = {
  dataLayer: SessionManifestDataLayer;
  logger?: { info: (payload: Record<string, unknown>, message: string) => void; error?: (payload: Record<string, unknown>, message: string) => void };
};

const handler = (
  options: CreateSessionManifestHttpHandlersOptions,
  route: SessionManifestHttpRoute,
  parse: (value: unknown) => ReturnType<typeof createSessionManifestHttpReadRequest>,
  run: (request: SessionManifestHttpBoundaryRequest) => Promise<unknown>
) => async (payload: unknown): Promise<SessionManifestHttpResponse> => {
  const parsed = parse(payload);
  if (!parsed.ok) {
    options.logger?.error?.({ event: 'manifest-http-handler', route, success: false, error: parsed.error }, 'http handler invocation');
    return { status: 400, body: parsed.error };
  }
  const body = await run(parsed.value);
  options.logger?.info({ event: 'manifest-http-handler', route, success: true }, 'http handler invocation');
  return { status: 200, body };
};

export const createSessionManifestHttpHandlers = (
  options: CreateSessionManifestHttpHandlersOptions
): SessionManifestHttpHandlers => ({
  [SESSION_MANIFEST_HTTP_ROUTES.read]: handler(options, SESSION_MANIFEST_HTTP_ROUTES.read, createSessionManifestHttpReadRequest, options.dataLayer.read),
  [SESSION_MANIFEST_HTTP_ROUTES.reconcile]: handler(options, SESSION_MANIFEST_HTTP_ROUTES.reconcile, createSessionManifestHttpReconcileRequest, options.dataLayer.reconcile),
  [SESSION_MANIFEST_HTTP_ROUTES.audit]: handler(options, SESSION_MANIFEST_HTTP_ROUTES.audit, createSessionManifestHttpAuditRequest, options.dataLayer.auditTrail),
  [SESSION_MANIFEST_HTTP_ROUTES.doctorStatus]: handler(options, SESSION_MANIFEST_HTTP_ROUTES.doctorStatus, createSessionManifestHttpDoctorStatusRequest, options.dataLayer.doctorStatus),
  [SESSION_MANIFEST_HTTP_ROUTES.nudge]: async () => ({ status: 404, body: { message: 'nudge not registered' } })
});
