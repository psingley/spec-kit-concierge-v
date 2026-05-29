import { readFile, writeFile } from 'node:fs/promises';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type PixelResult = {
  diffPercent: number;
  changedPixels: number;
};

export const verifyPixels = async (designPath: string, shippedPath: string, diffPath: string): Promise<PixelResult> => {
  const design = PNG.sync.read(await readFile(designPath));
  const shipped = PNG.sync.read(await readFile(shippedPath));
  const width = Math.min(design.width, shipped.width);
  const height = Math.min(design.height, shipped.height);
  const crop = (source: PNG): PNG => {
    const output = new PNG({ width, height });
    PNG.bitblt(source, output, 0, 0, width, height, 0, 0);
    return output;
  };
  const designCrop = crop(design);
  const shippedCrop = crop(shipped);
  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(designCrop.data, shippedCrop.data, diff.data, width, height, { threshold: 0.1, includeAA: false });
  await writeFile(diffPath, PNG.sync.write(diff));
  return {
    diffPercent: Number(((changedPixels / (width * height)) * 100).toFixed(2)),
    changedPixels
  };
};
