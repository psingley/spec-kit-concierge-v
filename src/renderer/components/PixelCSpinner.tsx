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
  const propsRef = useRef({ cell, color, pixelation, size, speed });

  useEffect(() => {
    propsRef.current = { cell, color, pixelation, size, speed };
  }, [cell, color, pixelation, size, speed]);

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
      const current = propsRef.current;
      drawingContext.clearRect(0, 0, current.size, current.size);
      drawingContext.fillStyle = current.color;
      const cells = Math.max(4, Math.floor(current.size / current.cell));
      for (let i = 0; i < cells; i += 1) {
        const angle = (i / cells) * Math.PI * 2 + frame * 0.08 * current.speed;
        const radius = current.size / 2 - current.cell;
        const alpha = (i + frame * current.pixelation) % cells === 0 ? 1 : 0.25;
        drawingContext.globalAlpha = alpha;
        drawingContext.fillRect(current.size / 2 + Math.cos(angle) * radius, current.size / 2 + Math.sin(angle) * radius, current.cell, current.cell);
      }
      drawingContext.globalAlpha = 1;
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [busy]);

  return <canvas aria-hidden="true" data-vd-role="spinner" ref={canvasRef} width={size} height={size} className="pixel-spinner" />;
};
