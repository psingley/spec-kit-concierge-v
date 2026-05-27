/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

type ConciergePreloadBridge = {
  app: {
    getVersion: () => Promise<unknown>;
  };
};

interface Window {
  concierge: ConciergePreloadBridge;
}
