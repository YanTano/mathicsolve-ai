/**
 * Optimizes image data URL for ultra-fast network transfer and AI processing.
 * Scales down large camera/gallery captures to max 1024px and encodes as compressed JPEG.
 */
export async function optimizeImageDataUrl(
  dataUrl: string,
  maxDimension = 1024,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    // If input isn't a valid dataUrl or is tiny, return as-is
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate scaled dimensions
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return resolve(dataUrl);
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Export as optimized JPEG
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
