import assert from 'node:assert/strict';
import test from 'node:test';
import { removeSignatureBackground } from '../src/lib/signature-image.ts';

const setPixel = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: [number, number, number, number],
) => data.set(color, (y * width + x) * 4);

test('removes a tinted grey background while preserving blue signature ink', () => {
  const width = 20;
  const height = 12;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const noise = (x + y) % 7;
      setPixel(data, width, x, y, [174 + noise, 177 + noise, 156 + noise, 255]);
    }
  }
  for (let x = 5; x <= 14; x += 1) setPixel(data, width, x, 6, [35, 48, 112, 255]);

  const bounds = removeSignatureBackground(data, width, height);

  assert.deepEqual(bounds, { minX: 5, minY: 6, maxX: 14, maxY: 6 });
  assert.equal(data[3], 0, 'background should be transparent');
  assert.equal(data[(6 * width + 10) * 4 + 3], 255, 'signature ink should remain opaque');
});

test('keeps an already transparent signature and returns its content bounds', () => {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  setPixel(data, width, 3, 4, [20, 20, 20, 255]);
  setPixel(data, width, 4, 4, [20, 20, 20, 255]);

  assert.deepEqual(removeSignatureBackground(data, width, height), { minX: 3, minY: 4, maxX: 4, maxY: 4 });
});
