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
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const red = pixels.data[offset];
        const green = pixels.data[offset + 1];
        const blue = pixels.data[offset + 2];
        const alpha = pixels.data[offset + 3];
        const isNeutralLightBackground = red >= 190 && green >= 190 && blue >= 190
          && Math.max(red, green, blue) - Math.min(red, green, blue) <= 28;

        if (alpha < 12 || isNeutralLightBackground) {
          pixels.data[offset + 3] = 0;
          continue;
        }
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return source;
    context.putImageData(pixels, 0, 0);
    const padding = Math.max(4, Math.round(Math.min(width, height) * 0.025));
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);
    const output = document.createElement('canvas');
    output.width = cropWidth;
    output.height = cropHeight;
    output.getContext('2d')?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return output.toDataURL('image/png');
  } catch {
    return source;
  }
}
