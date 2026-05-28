import React, { useEffect, useRef } from 'react';

export type PixelCSpinnerProps = {
  busy: boolean;
  size?: number;
  cell?: number;
  pixelation?: number;
  color?: string;
  speed?: number;
};

export const PixelCSpinner = ({
  busy,
  size = 28,
  cell = 4,
  pixelation = 1,
  color = 'currentColor',
  speed = 1
}: PixelCSpinnerProps): React.ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!busy || canvas === null) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return undefined;
    }
    const drawingContext = context;
    let frame = 0;
    let raf = 0;
    const draw = (): void => {
      drawingContext.clearRect(0, 0, size, size);
      drawingContext.fillStyle = color;
      const cells = Math.max(4, Math.floor(size / cell));
      for (let i = 0; i < cells; i += 1) {
        const angle = (i / cells) * Math.PI * 2 + frame * 0.08 * speed;
        const radius = size / 2 - cell;
        const alpha = (i + frame * pixelation) % cells === 0 ? 1 : 0.25;
        drawingContext.globalAlpha = alpha;
        drawingContext.fillRect(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius, cell, cell);
      }
      drawingContext.globalAlpha = 1;
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [busy, cell, color, pixelation, size, speed]);

  return <canvas aria-hidden="true" ref={canvasRef} width={size} height={size} className="pixel-spinner" />;
};
