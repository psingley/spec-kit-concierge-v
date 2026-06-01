import { describe, expect, it, vi } from 'vitest';
import { createBackForwardBlocker } from './backForwardBlocker';

describe('createBackForwardBlocker', () => {
  it('prevents Alt+ArrowLeft', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };

    handler(
      event as unknown as Electron.Event,
      { alt: true, key: 'ArrowLeft', control: false, meta: false, shift: false, type: 'keyDown' } as unknown as Electron.Input
    );

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('prevents Alt+ArrowRight', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };

    handler(
      event as unknown as Electron.Event,
      { alt: true, key: 'ArrowRight', control: false, meta: false, shift: false, type: 'keyDown' } as unknown as Electron.Input
    );

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('does not prevent other navigation input', () => {
    const handler = createBackForwardBlocker();
    const event = { preventDefault: vi.fn() };

    handler(
      event as unknown as Electron.Event,
      { alt: false, key: 'ArrowLeft', control: false, meta: false, shift: false, type: 'keyDown' } as unknown as Electron.Input
    );

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
