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
  size = 9,
  cell = 2,
  pixelation = 1,
  color,
  speed = 1
}: PixelCSpinnerProps): React.ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ busy, color, pixelation, speed });

  useEffect(() => {
    propsRef.current = { busy, color, pixelation, speed };
  }, [busy, color, pixelation, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return undefined;
    }
    const drawingContext = context;
    const dpr = window.devicePixelRatio || 1;
    const pixelSize = size * cell;
    canvas.width = pixelSize * dpr;
    canvas.height = pixelSize * dpr;
    canvas.style.width = `${pixelSize}px`;
    canvas.style.height = `${pixelSize}px`;
    drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    const center = (size - 1) / 2;
    const maxRadius = Math.hypot(center, center);
    const pixels: Array<{ x: number; y: number; distance: number; angle: number; jitter: number }> = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - center;
        const dy = y - center;
        const distance = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;
        const jitter = Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);
        pixels.push({ x, y, distance, angle, jitter });
      }
    }

    let frame = 0;
    let cycleIndex = 0;
    let raf = 0;
    let last = performance.now();
    const cycleTypes = ['pixely', 'sharp', 'bold', 'pixely', 'pixely'];
    const resolveColor = (): string => {
      const current = propsRef.current;
      if (current.color !== undefined) {
        if (current.color.startsWith('var(')) {
          const variable = current.color.slice(4, -1).trim();
          return getComputedStyle(canvas).getPropertyValue(variable).trim() || '#3a7e9a';
        }
        return current.color;
      }
      const styles = getComputedStyle(canvas);
      return current.busy
        ? styles.getPropertyValue('--accent').trim() || '#3a7e9a'
        : styles.color || styles.getPropertyValue('--text-dim').trim() || '#888';
    };
    const render = (phase: number, kind: string): void => {
      const current = propsRef.current;
      drawingContext.clearRect(0, 0, pixelSize, pixelSize);
      drawingContext.fillStyle = resolveColor();
      if (size === 9 && cell === 2) {
        const pattern = ['..######.', '########.', '.########', '###...#..', '###......', '###...#..', '####.####', '#########', '.######..'];
        drawingContext.globalAlpha = 0.9;
        for (const [y, row] of pattern.entries()) {
          for (let x = 0; x < row.length; x += 1) {
            if (row[x] === '#') {
              drawingContext.fillRect(x * cell, y * cell, cell, cell);
            }
          }
        }
        drawingContext.globalAlpha = 1;
        return;
      }
      const breath = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      let outerRadius = (0.78 + breath * 0.2) * maxRadius + 0.3;
      let innerRadius = Math.max(1.4, outerRadius * 0.45);
      let wedge = Math.PI * 0.32 * (0.6 + breath * 0.4);
      let refinedness = 0;

      if (kind === 'sharp') {
        refinedness = Math.abs(Math.cos(phase * Math.PI * 2)) ** 3;
        outerRadius = (0.74 + breath * 0.22) * maxRadius + 0.3;
        innerRadius = Math.max(1.5, outerRadius * 0.48);
        wedge = Math.PI * 0.32 * (0.55 + breath * 0.45);
      } else if (kind === 'bold') {
        refinedness = breath ** 2;
        outerRadius = (0.86 + breath * 0.18) * maxRadius + 0.5;
        innerRadius = Math.max(1.1, outerRadius * 0.34);
        wedge = Math.PI * 0.32 * (0.5 + (1 - breath) * 0.4);
      }

      const outerJitter = (0.9 * (1 - refinedness) + 0.05 * refinedness) * current.pixelation;
      const innerJitter = (0.8 * (1 - refinedness) + 0.05 * refinedness) * current.pixelation;
      const wedgeJitter = (0.15 * (1 - refinedness) + 0.02 * refinedness) * current.pixelation;

      drawingContext.globalAlpha = 0.9;
      for (const pixel of pixels) {
        const dx = Math.abs(pixel.x - center);
        const dy = Math.abs(pixel.y - center);
        if (dx >= center - 0.25 && dy >= center - 0.25) continue;
        if (outerRadius - pixel.distance < pixel.jitter * outerJitter - 0.15) continue;
        if (pixel.distance - innerRadius < -pixel.jitter * innerJitter - 0.1) continue;
        let angle = pixel.angle % (Math.PI * 2);
        if (angle > Math.PI) angle -= Math.PI * 2;
        if (Math.abs(angle) < wedge / 2 + pixel.jitter * wedgeJitter - 0.05) continue;
        drawingContext.fillRect(pixel.x * cell, pixel.y * cell, cell, cell);
      }
      drawingContext.globalAlpha = 1;
    };
    const tick = (now: number): void => {
      const delta = now - last;
      if (delta >= 42) {
        const current = propsRef.current;
        const basePeriod = current.busy ? 70 : 110;
        const period = Math.max(32, Math.round(basePeriod / current.speed));
        const nextFrame = frame + 1;
        if (nextFrame >= period) {
          cycleIndex = (cycleIndex + 1) % cycleTypes.length;
          frame = 0;
        } else {
          frame = nextFrame;
        }
        render(frame / period, cycleTypes[cycleIndex] ?? 'pixely');
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cell, size]);

  return <canvas aria-hidden="true" data-vd-role="spinner" ref={canvasRef} className="pixel-spinner" />;
};
