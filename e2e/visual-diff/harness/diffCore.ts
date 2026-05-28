import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { Rect } from './screens.config';

export type Mask = Rect & { reason: string };

export type ComparePngsOptions = {
  bbox?: Rect;
  masks?: Mask[];
};

export type ComparePngsResult = {
  diff: PNG;
  diffPercent: number;
};

const clonePng = (image: PNG): PNG => PNG.sync.read(PNG.sync.write(image));

const crop = (source: PNG, rect: Rect): PNG => {
  const output = new PNG({ width: rect.width, height: rect.height });
  PNG.bitblt(source, output, rect.x, rect.y, rect.width, rect.height, 0, 0);
  return output;
};

const fillRect = (image: PNG, rect: Rect): void => {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(image.width, rect.x + rect.width);
  const y1 = Math.min(image.height, rect.y + rect.height);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = (image.width * y + x) << 2;
      image.data[index] = 128;
      image.data[index + 1] = 128;
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
};

const normalize = (image: PNG, options: ComparePngsOptions): PNG => {
  const normalized = options.bbox ? crop(image, options.bbox) : clonePng(image);
  for (const mask of options.masks ?? []) {
    const rect = options.bbox ? { ...mask, x: mask.x - options.bbox.x, y: mask.y - options.bbox.y } : mask;
    fillRect(normalized, rect);
  }
  return normalized;
};

export const comparePngs = (designSource: PNG, shippedSource: PNG, options: ComparePngsOptions = {}): ComparePngsResult => {
  const design = normalize(designSource, options);
  const shipped = normalize(shippedSource, options);
  if (design.width !== shipped.width || design.height !== shipped.height) {
    throw new Error(`Screenshot dimensions differ: design ${design.width}x${design.height}, shipped ${shipped.width}x${shipped.height}`);
  }
  const diff = new PNG({ width: design.width, height: design.height });
  const changed = pixelmatch(design.data, shipped.data, diff.data, design.width, design.height, {
    threshold: 0.1,
    includeAA: false
  });
  return {
    diff,
    diffPercent: Number(((changed / (design.width * design.height)) * 100).toFixed(2))
  };
};
