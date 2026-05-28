import { beforeEach, describe, expect, it, vi } from 'vitest';

const render = vi.fn();
const dispatch = vi.fn();
const provider = vi.fn(({ children }: { children: unknown }) => children);

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render }))
}));

vi.mock('react-redux', () => ({
  Provider: provider
}));

vi.mock('./store', () => ({
  store: { dispatch }
}));

vi.mock('./App', () => ({
  App: () => null
}));

vi.mock('./api', () => ({
  api: {
    endpoints: {
      getAppVersion: {
        initiate: vi.fn(() => ({ type: 'getAppVersion' }))
      },
      getBoundCLICapabilities: {
        initiate: vi.fn(() => ({ type: 'getBoundCLICapabilities' }))
      }
    }
  }
}));

describe('renderer entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    dispatch.mockReturnValue({
      unwrap: vi.fn(async () => ({ version: '0.1.0' }))
    });
  });

  it('wraps the proof UI in a single product Provider and uses the product store', async () => {
    await import('./index');

    const rendered = render.mock.calls[0]?.[0] as { type?: unknown } | undefined;
    expect(rendered?.type).toBe(provider);
    expect(render).toHaveBeenCalled();
  });
});
