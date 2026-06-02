import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import { invalid, isRecord, type RendererFactoryResult } from './factoryUtils';
import type { IpcQueryError } from './baseQuery';

export type SessionManifestEndpointRequest = {
  repositoryPath: string;
};

const parseObjectPayload = (value: unknown): RendererFactoryResult<Record<string, unknown>, 'InvalidSessionManifestEndpointPayload'> =>
  isRecord(value)
    ? { ok: true, value }
    : invalid('InvalidSessionManifestEndpointPayload', 'payload must be an object', '$');

const query =
  (method: 'read' | 'reconcile' | 'doctorStatus' | 'auditTrail') =>
  async (arg: SessionManifestEndpointRequest): Promise<{ data: Record<string, unknown> } | { error: IpcQueryError }> => {
    const bridge = window.concierge.sessionManifest;
    if (bridge === undefined) {
      return { error: { status: 'IPC_ERROR', data: { name: 'MissingBridge', message: 'sessionManifest bridge missing' } } };
    }
    const parsed = parseObjectPayload(await bridge[method](arg));
    return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
  };

export const sessionManifestApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSessionManifest: builder.query<Record<string, unknown>, SessionManifestEndpointRequest>({
      queryFn: query('read'),
      providesTags: ['Session']
    }),
    reconcileSessionManifest: builder.query<Record<string, unknown>, SessionManifestEndpointRequest>({
      queryFn: query('reconcile'),
      providesTags: ['Session']
    }),
    getDoctorStatus: builder.query<Record<string, unknown>, SessionManifestEndpointRequest>({
      queryFn: query('doctorStatus'),
      providesTags: ['Agent']
    }),
    getAuditTrail: builder.query<Record<string, unknown>, SessionManifestEndpointRequest>({
      queryFn: query('auditTrail'),
      providesTags: ['Transcript']
    })
  })
});
