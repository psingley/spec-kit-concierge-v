import { describe, expect, it, vi } from 'vitest';

// We test the handler function in isolation — not the full Electron main process
import { createBackForwardBlocker } from './backForwardBlocker';

describe('createBackForwardBlocker', () => {
  it('prevents Alt+ArrowLeft', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };
    const input = { alt: true, key: 'ArrowLeft', control: false, meta: false, shift: false, type: 'keyDown' };

    handler(event as unknown as Electron.Event, input as unknown as Electron.Input);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('prevents Alt+ArrowRight', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };
    const input = { alt: true, key: 'ArrowRight', control: false, meta: false, shift: false, type: 'keyDown' };

    handler(event as unknown as Electron.Event, input as unknown as Electron.Input);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does NOT prevent other Alt key combos', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };
    const input = { alt: true, key: 'ArrowUp', control: false, meta: false, shift: false, type: 'keyDown' };

    handler(event as unknown as Electron.Event, input as unknown as Electron.Input);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('does NOT prevent ArrowLeft without Alt modifier', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };
    const input = { alt: false, key: 'ArrowLeft', control: false, meta: false, shift: false, type: 'keyDown' };

    handler(event as unknown as Electron.Event, input as unknown as Electron.Input);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
