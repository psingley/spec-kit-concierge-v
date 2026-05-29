/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
declare const __LICENSE_TEXT__: string;

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
    checkout?: (request: unknown) => Promise<unknown>;
    createDraft?: (request: unknown) => Promise<unknown>;
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
    loginGitHub?: (request: unknown) => Promise<unknown>;
    loginCopilot?: (request: unknown) => Promise<unknown>;
    loginAtlassian?: (request: unknown) => Promise<unknown>;
  };
  session?: {
    listAcp: (request: unknown) => Promise<unknown>;
    createAcp: (request: unknown) => Promise<unknown>;
  };
  activity?: {
    read: (request: unknown) => Promise<unknown>;
  };
  repos?: {
    list: (request: unknown) => Promise<unknown>;
  };
  branches?: {
    sessions: (request: unknown) => Promise<unknown>;
  };
  artifacts?: {
    read: (request: unknown) => Promise<unknown>;
  };
  copilot?: {
    specify: (request: unknown) => Promise<unknown>;
    clarify?: (request: unknown) => Promise<unknown>;
    subscribeStepStream: (channel: string, subscriptionId: string, callback: (event: unknown) => void) => () => void;
    subscribeSpecify: (subscriptionId: string, callback: (event: unknown) => void) => () => void;
  };
};

interface Window {
  concierge: ConciergePreloadBridge;
}
