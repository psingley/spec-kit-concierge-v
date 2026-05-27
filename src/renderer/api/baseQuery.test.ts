import { describe, expect, it, vi } from 'vitest';
import { ipcBaseQuery } from './baseQuery';

describe('ipcBaseQuery', () => {
  it('returns data for successful preload invocation', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => ({ version: '0.1.0' }))
      },
      acp: {
        probeBoundCLI: vi.fn()
      }
    };

    await expect(ipcBaseQuery({ channel: 'app:getVersion' }, {} as never, {})).resolves.toEqual({
      data: { version: '0.1.0' }
    });
  });

  it('returns an IPC_ERROR envelope for rejected IPC failures', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(async () => {
          throw new Error('ipc rejected');
        })
      },
      acp: {
        probeBoundCLI: vi.fn()
      }
    };

    await expect(ipcBaseQuery({ channel: 'app:getVersion' }, {} as never, {})).resolves.toEqual({
      error: {
        status: 'IPC_ERROR',
        data: {
          name: 'Error',
          message: 'ipc rejected'
        }
      }
    });
  });

  it('returns an IPC_ERROR envelope for thrown IPC failures without throwing raw Error', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn(() => {
          throw new TypeError('ipc threw');
        })
      },
      acp: {
        probeBoundCLI: vi.fn()
      }
    };

    await expect(ipcBaseQuery({ channel: 'app:getVersion' }, {} as never, {})).resolves.toEqual({
      error: {
        status: 'IPC_ERROR',
        data: {
          name: 'TypeError',
          message: 'ipc threw'
        }
      }
    });
  });

  it('returns data for successful ACP proof preload invocation', async () => {
    window.concierge = {
      app: {
        getVersion: vi.fn()
      },
      acp: {
        probeBoundCLI: vi.fn(async () => ({ protocolVersion: 1 }))
      }
    };

    await expect(ipcBaseQuery({ channel: 'acp:probeBoundCLI' }, {} as never, {})).resolves.toEqual({
      data: { protocolVersion: 1 }
    });
  });
});
