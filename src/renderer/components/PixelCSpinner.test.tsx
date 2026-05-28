import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PixelCSpinner } from './PixelCSpinner';

const createContext = () => {
  const alphaTrace: number[] = [];
  const context = {
  clearRect: vi.fn(),
    fillRect: vi.fn(() => {
      alphaTrace.push(context.globalAlpha);
    }),
  fillStyle: '',
    globalAlpha: 1,
    alphaTrace
  };
  return context;
};

describe('PixelCSpinner', () => {
  let rafCallbacks: FrameRequestCallback[];
  let context: ReturnType<typeof createContext>;

  beforeEach(() => {
    rafCallbacks = [];
    context = createContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a canvas element', () => {
    const { container } = render(<PixelCSpinner busy={false} />);

    expect(container.querySelector('canvas.pixel-spinner')).not.toBeNull();
  });

  it('requests animation frames when busy', () => {
    render(<PixelCSpinner busy />);

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('cancels the scheduled frame on unmount', () => {
    const { unmount } = render(<PixelCSpinner busy />);

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('changes the draw trace when pixelation changes', () => {
    render(<PixelCSpinner busy size={16} cell={4} pixelation={1} />);
    rafCallbacks[0]?.(0);
    rafCallbacks[1]?.(16);
    const pixelationOneAlpha = [...context.alphaTrace];

    vi.restoreAllMocks();
    rafCallbacks = [];
    context = createContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    render(<PixelCSpinner busy size={16} cell={4} pixelation={2} />);
    rafCallbacks[0]?.(0);
    rafCallbacks[1]?.(16);
    const pixelationTwoAlpha = [...context.alphaTrace];

    expect(pixelationTwoAlpha).not.toEqual(pixelationOneAlpha);
  });
});
