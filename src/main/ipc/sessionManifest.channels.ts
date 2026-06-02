export const SESSION_MANIFEST_CHANNELS = {
  read: 'sessionManifest:read',
  reconcile: 'sessionManifest:reconcile',
  auditTrail: 'sessionManifest:auditTrail',
  doctorStatus: 'sessionManifest:doctorStatus',
  nudge: 'sessionManifest:nudge'
} as const;

export type SessionManifestChannel = (typeof SESSION_MANIFEST_CHANNELS)[keyof typeof SESSION_MANIFEST_CHANNELS];
