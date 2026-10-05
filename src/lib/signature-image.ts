export type SignatureImageBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const median = (values: number[]) => {
  if (values.length === 0) return 255;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const colorDistance = (
  red: number,
  green: number,
  blue: number,
  backgroundRed: number,
  backgroundGreen: number,
  backgroundBlue: number,
) => Math.sqrt(
  (red - backgroundRed) ** 2
  + (green - backgroundGreen) ** 2
  + (blue - backgroundBlue) ** 2,
);

/**
 * Removes a photographed/scanned paper background by estimating its colour from
 * the image border. Keeping this logic independent from Canvas makes it easy to
 * regression-test and lets old stored signatures be cleaned when rendered.
 */
export function removeSignatureBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): SignatureImageBounds | null {
  const borderSize = Math.max(1, Math.min(12, Math.round(Math.min(width, height) * 0.04)));
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= borderSize && x < width - borderSize && y >= borderSize && y < height - borderSize) continue;
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 12) continue;
      reds.push(data[offset]);
      greens.push(data[offset + 1]);
      blues.push(data[offset + 2]);
    }
  }

  const hasOpaqueBorder = reds.length > 0;
  const backgroundRed = median(reds);
  const backgroundGreen = median(greens);
  const backgroundBlue = median(blues);
  const borderDistances = reds.map((red, index) => colorDistance(
    red,
    greens[index],
    blues[index],
    backgroundRed,
    backgroundGreen,
    backgroundBlue,
  )).sort((left, right) => left - right);
  const borderVariation = borderDistances[Math.floor(borderDistances.length * 0.9)] ?? 0;
  const backgroundThreshold = Math.max(46, Math.min(88, 20 + borderVariation * 2.5));
  const featherWidth = 22;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];
      const neutralLightBackground = red >= 190 && green >= 190 && blue >= 190
        && Math.max(red, green, blue) - Math.min(red, green, blue) <= 28;
      const distance = hasOpaqueBorder
        ? colorDistance(red, green, blue, backgroundRed, backgroundGreen, backgroundBlue)
        : Number.POSITIVE_INFINITY;

      if (alpha < 12 || neutralLightBackground || distance <= backgroundThreshold) {
        data[offset + 3] = 0;
        continue;
      }

      if (distance < backgroundThreshold + featherWidth) {
        data[offset + 3] = Math.round(alpha * ((distance - backgroundThreshold) / featherWidth));
      }

      if (data[offset + 3] < 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return maxX < minX || maxY < minY ? null : { minX, minY, maxX, maxY };
}

export async function cleanAndCropSignatureImage(source: string): Promise<string> {
  if (typeof document === 'undefined') return source;

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('SIGNATURE_IMAGE_LOAD_FAILED'));
      element.src = source;
    });

    const maximumDimension = 1600;
    const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return source;
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height);
    const bounds = removeSignatureBackground(pixels.data, width, height);
    if (!bounds) return source;

    context.putImageData(pixels, 0, 0);
    const padding = Math.max(4, Math.round(Math.min(width, height) * 0.025));
    const cropX = Math.max(0, bounds.minX - padding);
    const cropY = Math.max(0, bounds.minY - padding);
    const cropWidth = Math.min(width - cropX, bounds.maxX - bounds.minX + 1 + padding * 2);
    const cropHeight = Math.min(height - cropY, bounds.maxY - bounds.minY + 1 + padding * 2);
    const output = document.createElement('canvas');
    output.width = cropWidth;
    output.height = cropHeight;
    output.getContext('2d')?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return output.toDataURL('image/png');
  } catch {
    return source;
  }
}
