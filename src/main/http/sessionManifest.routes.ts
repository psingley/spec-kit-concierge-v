export const SESSION_MANIFEST_HTTP_ROUTES = {
  read: '/v1/session-manifest',
  reconcile: '/v1/session-manifest/reconcile',
  audit: '/v1/session-manifest/audit',
  doctorStatus: '/v1/session-manifest/doctor-status',
  nudge: '/v1/session-manifest/nudge'
} as const;

export type SessionManifestHttpRoute =
  (typeof SESSION_MANIFEST_HTTP_ROUTES)[keyof typeof SESSION_MANIFEST_HTTP_ROUTES];
