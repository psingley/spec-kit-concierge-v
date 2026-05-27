/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

type ConciergePreloadBridge = {
  app: {
    getVersion: () => Promise<unknown>;
  };
  acp: {
    probeBoundCLI: () => Promise<unknown>;
  };
  workspace?: {
    read: (request: unknown) => Promise<unknown>;
  };
  git?: {
    read: (request: unknown) => Promise<unknown>;
  };
  steps?: {
    read: (request: unknown) => Promise<unknown>;
  };
  preferences?: {
    read: (request: unknown) => Promise<unknown>;
    write: (request: unknown) => Promise<unknown>;
  };
  auth?: {
    status: (request: unknown) => Promise<unknown>;
  };
  session?: {
    listAcp: (request: unknown) => Promise<unknown>;
    createAcp: (request: unknown) => Promise<unknown>;
  };
  activity?: {
    read: (request: unknown) => Promise<unknown>;
  };
};

interface Window {
  concierge: ConciergePreloadBridge;
}
