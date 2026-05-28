import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { comparePngs } from './diffCore';

const solid = (width: number, height: number, rgba: [number, number, number, number]): PNG => {
  const image = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2;
      image.data[index] = rgba[0];
      image.data[index + 1] = rgba[1];
      image.data[index + 2] = rgba[2];
      image.data[index + 3] = rgba[3];
    }
  }
  return image;
};

describe('visual diff PNG comparison', () => {
  it('crops before masking and computes diff percent against the cropped area', () => {
    const design = solid(4, 4, [255, 255, 255, 255]);
    const shipped = solid(4, 4, [255, 255, 255, 255]);
    shipped.data[(4 * 1 + 1) << 2] = 0;
    shipped.data[(4 * 2 + 2) << 2] = 0;

    const result = comparePngs(design, shipped, {
      bbox: { x: 1, y: 1, width: 2, height: 2 },
      masks: [{ x: 2, y: 2, width: 1, height: 1, reason: 'test dynamic region' }]
    });

    expect(result.diffPercent).toBe(25);
    expect(result.diff.width).toBe(2);
    expect(result.diff.height).toBe(2);
  });
});
