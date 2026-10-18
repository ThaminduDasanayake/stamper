import { getStampPoints } from "@/components/stamp";

export type StampConfig = {
  // Image
  imageUrl: string;
  country?: string; // e.g. "Pixel Parks"
  denomination?: string; // e.g. "24"
  subtitle?: string; // e.g. "Field archive · 01"

  // Frame defaults
  aspectRatio?: "4/5" | "1/1" | "5/4" | "3/4" | "auto";
  customAspectRatio?: number;
  paperColor?: string;
  inkColor?: string;
  padding?: number;
  horizontalPerforations?: number;
  verticalPerforations?: number;
  perforationDepth?: number;
};

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote http/https URLs.
    // Setting crossOrigin on data: or blob: URIs causes CORS failures in Safari!
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export type CropOptions = {
  cropX: number; // in image natural pixels
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  rotation?: number;
};

export function computeCropFromCutter(
  cutter: { x: number; y: number; width: number; rotation: number },
  config: StampConfig,
  naturalWidth: number,
  naturalHeight: number,
  imageDisplayWidth = 680,
  imageDisplayX = 40,
  imageDisplayY = 40
): CropOptions {
  let aspectMultiplier = 5 / 4;
  if (config.aspectRatio === "1/1") aspectMultiplier = 1;
  else if (config.aspectRatio === "5/4") aspectMultiplier = 4 / 5;
  else if (config.aspectRatio === "3/4") aspectMultiplier = 4 / 3;
  else if (config.aspectRatio === "auto") {
    aspectMultiplier =
      config.customAspectRatio ||
      (naturalWidth ? naturalHeight / naturalWidth : 1);
  }

  const cutterHeight = Math.round(cutter.width * aspectMultiplier);
  const naturalW = naturalWidth || imageDisplayWidth;
  const naturalH = naturalHeight || imageDisplayWidth * aspectMultiplier;
  const displayH = (naturalH / naturalW) * imageDisplayWidth;

  const padding = config.padding ?? 13;
  const innerX = cutter.x + padding;
  const innerY = cutter.y + padding;
  const innerW = Math.max(10, cutter.width - padding * 2);
  const innerH = Math.max(10, cutterHeight - padding * 2);

  const scaleX = naturalW / imageDisplayWidth;
  const scaleY = naturalH / displayH;

  const relX = innerX - imageDisplayX;
  const relY = innerY - imageDisplayY;

  return {
    cropX: Math.round(relX * scaleX),
    cropY: Math.round(relY * scaleY),
    cropWidth: Math.round(innerW * scaleX),
    cropHeight: Math.round(innerH * scaleY),
    rotation: cutter.rotation,
  };
}

/**
 * High-resolution canvas rendering of a perforated stamp
 */
export async function renderStampToCanvas(
  config: StampConfig,
  targetWidth = 1000,
  cropOptions?: CropOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");

  // Determine aspect ratio dimensions
  let aspectMultiplier = 5 / 4;
  if (config.aspectRatio === "1/1") aspectMultiplier = 1;
  else if (config.aspectRatio === "5/4") aspectMultiplier = 4 / 5;
  else if (config.aspectRatio === "3/4") aspectMultiplier = 4 / 3;
  else if (config.aspectRatio === "auto") {
    aspectMultiplier = config.customAspectRatio || 1;
  }

  const width = targetWidth;
  const height = Math.round(targetWidth * aspectMultiplier);

  canvas.width = width;
  canvas.height = height;

  // 1. Clip to stamp perforations
  const points = getStampPoints({
    depth: config.perforationDepth ?? 2.4,
    horizontalCount: config.horizontalPerforations ?? 12,
    verticalCount: config.verticalPerforations ?? 15,
  });

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i];
    const x = (px / 100) * width;
    const y = (py / 100) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.clip();

  // 2. Paper background & gradient highlight matching Stamp component
  ctx.fillStyle = config.paperColor || "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const bgGrad = ctx.createLinearGradient(0, 0, width * 0.7, height * 0.7);
  bgGrad.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  bgGrad.addColorStop(0.42, "transparent");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Inner frame content
  // Scale padding proportionally (default 13px at 198px width)
  const padRatio = width / 198;
  const paddingPx = Math.round((config.padding ?? 13) * padRatio);

  const innerX = paddingPx;
  const innerY = paddingPx;
  const innerW = width - paddingPx * 2;
  const innerH = height - paddingPx * 2;

  // 4. Draw user image inside inner frame
  if (config.imageUrl) {
    try {
      const img = await loadImage(config.imageUrl);

      ctx.save();
      // Clip strictly inside inner frame
      ctx.beginPath();
      ctx.rect(innerX, innerY, innerW, innerH);
      ctx.clip();

      // Background under image inside inner frame
      ctx.fillStyle = config.paperColor || "#ffffff";
      ctx.fillRect(innerX, innerY, innerW, innerH);

      if (cropOptions) {
        // Precise stencil cutout from canvas coordinate mapping
        const {
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          rotation = 0,
        } = cropOptions;
        const centerX = innerX + innerW / 2;
        const centerY = innerY + innerH / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          -innerW / 2,
          -innerH / 2,
          innerW,
          innerH
        );
      } else {
        ctx.drawImage(img, innerX, innerY, innerW, innerH);
      }

      ctx.restore();
    } catch {
      // Fallback placeholder pattern if image fails to load
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(innerX, innerY, innerW, innerH);
    }
  }

  // 5. Stamp border matching shadow-[inset_0_0_0_1px_rgb(24_23_19_/_18%)]
  ctx.save();
  ctx.strokeStyle = "rgba(24, 23, 19, 0.18)";
  ctx.lineWidth = Math.max(1, Math.round(1 * padRatio));
  ctx.strokeRect(innerX, innerY, innerW, innerH);
  ctx.restore();

  // 6. Typography
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.52)";
  ctx.shadowBlur = 1 * padRatio;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1 * padRatio;

  const countryText = (config.country || "Pixel Parks").trim();
  if (countryText) {
    const fontSize = Math.round(10 * padRatio);
    ctx.font = `bold ${fontSize}px monospace, ui-monospace, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      countryText.toUpperCase(),
      innerX + 10 * padRatio,
      innerY + 10 * padRatio
    );
  }

  const denomText = (config.denomination || "24").trim();
  if (denomText) {
    const fontSize = Math.round(22 * padRatio);
    ctx.font = `bold ${fontSize}px monospace, ui-monospace, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(
      denomText,
      innerX + innerW - 10 * padRatio,
      innerY + 10 * padRatio
    );
  }

  const subtitleText = (config.subtitle || "Field archive · 01").trim();
  if (subtitleText) {
    const fontSize = Math.round(9 * padRatio);
    ctx.font = `bold ${fontSize}px monospace, ui-monospace, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      subtitleText.toUpperCase(),
      innerX + 10 * padRatio,
      innerY + innerH - 10 * padRatio
    );
  }
  ctx.restore();

  ctx.restore(); // Restore outer clip
  return canvas;
}

/**
 * Downloads a rendered stamp as PNG
 */
export async function downloadStampPng(
  config: StampConfig,
  fileName = "postage-stamp.png"
): Promise<void> {
  const canvas = await renderStampToCanvas(config, 1200);
  const dataUrl = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

/**
 * Copies a rendered stamp as PNG to clipboard
 */
export async function copyStampToClipboard(
  config: StampConfig
): Promise<boolean> {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  const canvas = await renderStampToCanvas(config, 1000);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      navigator.clipboard
        .write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ])
        .then(() => resolve(true))
        .catch(() => resolve(false));
    }, "image/png");
  });
}
