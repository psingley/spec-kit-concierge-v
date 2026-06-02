export const HYBRID_MANIFEST_LOG_EVENTS = [
  'session-manifest-read',
  'session-manifest-write',
  'manifest-anomaly-recorded',
  'manifest-intervention-recorded'
] as const;

export type HybridManifestLogEvent = (typeof HYBRID_MANIFEST_LOG_EVENTS)[number];

export type HybridManifestLogger = {
  info: (payload: Record<string, unknown>, message: string) => void;
};

export type HybridManifestLogPayload = Record<string, unknown>;

export const logHybridManifestEvent = (
  logger: HybridManifestLogger | undefined,
  event: HybridManifestLogEvent,
  payload: HybridManifestLogPayload
): void => {
  logger?.info(
    {
      event,
      feature: 'hybrid-manifest',
      ...payload
    },
    'hybrid manifest event'
  );
};
