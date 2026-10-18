/**
 * Reads a File and resizes it if it exceeds maxDimension (default 1600px),
 * returning a clean, optimized data URL to avoid browser memory issues.
 */
export function processImageFile(
  file: File,
  maxDimension = 1600
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error("Failed to read file"));
        return;
      }

      // If it's an SVG, return as is
      if (file.type === "image/svg+xml") {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(dataUrl); // Fallback to raw dataUrl
      img.onload = () => {
        const { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          resolve(dataUrl);
          return;
        }

        // Scale down proportionally
        let newWidth = width;
        let newHeight = height;
        if (width > height) {
          newWidth = maxDimension;
          newHeight = Math.round((height * maxDimension) / width);
        } else {
          newHeight = maxDimension;
          newWidth = Math.round((width * maxDimension) / height);
        }

        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        const format = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(format, 0.92));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
