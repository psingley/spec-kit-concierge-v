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
    const resolveColor = (value: string): string => {
      if (!value.startsWith('var(')) return value;
      const variable = value.slice(4, -1).trim();
      return getComputedStyle(canvas).getPropertyValue(variable).trim() || 'currentColor';
    };
    const draw = (): void => {
      const current = propsRef.current;
      drawingContext.clearRect(0, 0, current.size, current.size);
      drawingContext.fillStyle = resolveColor(current.color);
      const cells = Math.max(4, Math.floor(current.size / current.cell));
      if (cells === 9) {
        const pattern = ['.#####...', '########.', '########.', '###..##..', '###......', '########.', '########.', '#######..', '..##.....'];
        drawingContext.globalAlpha = 0.9;
        for (const [y, row] of pattern.entries()) {
          for (let x = 0; x < row.length; x += 1) {
            if (row[x] === '#') {
              drawingContext.fillRect(x * current.cell, y * current.cell, current.cell, current.cell);
            }
          }
        }
        drawingContext.globalAlpha = 1;
        frame += 1;
        raf = requestAnimationFrame(draw);
        return;
      }
      const center = (cells - 1) / 2;
      const maxRadius = Math.hypot(center, center);
      const phase = (frame * 0.03 * current.speed) % 1;
      const breath = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      const outerRadius = (0.78 + breath * 0.2) * maxRadius + 0.3;
      const innerRadius = Math.max(1.4, outerRadius * 0.45);
      const wedge = Math.PI * 0.32 * (0.6 + breath * 0.4);
      const outerJitter = 0.9 * current.pixelation;
      const innerJitter = 0.8 * current.pixelation;
      const wedgeJitter = 0.15 * current.pixelation;

      drawingContext.globalAlpha = 0.9;
      for (let y = 0; y < cells; y += 1) {
        for (let x = 0; x < cells; x += 1) {
          const dx = x - center;
          const dy = y - center;
          const distance = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const deterministicJitter = Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);
          if (Math.abs(dx) >= center - 0.25 && Math.abs(dy) >= center - 0.25) continue;
          if (outerRadius - distance < deterministicJitter * outerJitter - 0.15) continue;
          if (distance - innerRadius < -deterministicJitter * innerJitter - 0.1) continue;
          if (Math.abs(angle) < wedge / 2 + deterministicJitter * wedgeJitter - 0.05) continue;
          drawingContext.fillRect(x * current.cell, y * current.cell, current.cell, current.cell);
        }
      }
      drawingContext.globalAlpha = 1;
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [busy]);

  return <canvas aria-hidden="true" data-vd-role="spinner" ref={canvasRef} width={size} height={size} className="pixel-spinner" />;
};
