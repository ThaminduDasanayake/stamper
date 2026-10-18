import { getStampPoints } from "@/components/stamp";

export type StampTextItem = {
  id: string;
  text: string;
  x: number; // percentage 0..100 inside inner stamp frame
  y: number; // percentage 0..100 inside inner stamp frame
  fontSize: number; // base size (e.g. 16, scales with canvas)
  color: string; // hex or rgba
  fontFamily?: "mono" | "sans" | "serif";
  align?: "left" | "center" | "right";
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "custom";
};

export type StampConfig = {
  // Image
  imageUrl: string;
  country?: string; // Optional legacy field
  denomination?: string;
  subtitle?: string;

  // Stored crop coordinates
  crop?: CropOptions;
  cutterWidth?: number;

  // Custom post-stamp text layers
  textItems?: StampTextItem[];

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
  // Normalized 0..1 crop coordinates (fraction of source image)
  normX?: number;
  normY?: number;
  normWidth?: number;
  normHeight?: number;
  cutterWidth?: number;
  cutterX?: number;
  cutterY?: number;

  // Pixel coordinates in image natural pixels
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
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
    normX: relX / imageDisplayWidth,
    normY: relY / displayH,
    normWidth: innerW / imageDisplayWidth,
    normHeight: innerH / displayH,
    cutterWidth: cutter.width,
    cutterX: cutter.x,
    cutterY: cutter.y,
    cropX: Math.round(relX * scaleX),
    cropY: Math.round(relY * scaleY),
    cropWidth: Math.round(innerW * scaleX),
    cropHeight: Math.round(innerH * scaleY),
    rotation: cutter.rotation,
  };
}

/**
 * Extracts and cuts out only the cropped and rotated portion of the image,
 * returning a standalone cropped image as a data URL.
 */
export async function createCroppedImage(
  imageUrl: string,
  cropOptions?: CropOptions,
  maxDimension = 1600
): Promise<string> {
  if (!cropOptions) return imageUrl;

  const img = await loadImage(imageUrl);
  const sourceW = img.naturalWidth || img.width || 300;
  const sourceH = img.naturalHeight || img.height || 375;

  let sx: number;
  let sy: number;
  let sWidth: number;
  let sHeight: number;

  if (
    cropOptions.normWidth !== undefined &&
    cropOptions.normHeight !== undefined
  ) {
    sx = (cropOptions.normX ?? 0) * sourceW;
    sy = (cropOptions.normY ?? 0) * sourceH;
    sWidth = cropOptions.normWidth * sourceW;
    sHeight = cropOptions.normHeight * sourceH;
  } else {
    sx = cropOptions.cropX ?? 0;
    sy = cropOptions.cropY ?? 0;
    sWidth = cropOptions.cropWidth ?? sourceW;
    sHeight = cropOptions.cropHeight ?? sourceH;
  }

  // Clamp within source bounds
  sx = Math.max(0, Math.min(sourceW - 1, sx));
  sy = Math.max(0, Math.min(sourceH - 1, sy));
  sWidth = Math.max(1, Math.min(sourceW - sx, sWidth));
  sHeight = Math.max(1, Math.min(sourceH - sy, sHeight));

  const scale = Math.min(1, maxDimension / Math.max(sWidth, sHeight));
  const outW = Math.max(10, Math.round(sWidth * scale));
  const outH = Math.max(10, Math.round(sHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageUrl;

  const rotation = cropOptions.rotation || 0;
  if (rotation) {
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      sx,
      sy,
      sWidth,
      sHeight,
      -outW / 2,
      -outH / 2,
      outW,
      outH
    );
  } else {
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outW, outH);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Helper to draw text with precise letter spacing (tracking) and alignment,
 * using native ctx.letterSpacing when available or character stepping fallback.
 */
function drawTextWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  trackingEm: number,
  align: CanvasTextAlign = "left",
  baseline: CanvasTextBaseline = "alphabetic"
) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if ("letterSpacing" in ctx) {
    try {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(fontSize * trackingEm).toFixed(2)}px`;
      ctx.fillText(text, x, y);
      ctx.restore();
      return;
    } catch {
      // Fall through to manual loop if setting letterSpacing throws
    }
  }

  // Fallback: manual character-by-character drawing
  const trackingPx = fontSize * trackingEm;
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    totalWidth +=
      ctx.measureText(text[i]).width + (i < text.length - 1 ? trackingPx : 0);
  }

  let startX = x;
  if (align === "right") {
    startX = x - totalWidth;
  } else if (align === "center") {
    startX = x - totalWidth / 2;
  }

  ctx.textAlign = "left";
  let currentX = startX;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width + trackingPx;
  }

  ctx.restore();
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
  // Scale proportionally to the cutter on screen (referenceWidth = cutterWidth or 198)
  const activeCrop = cropOptions || config.crop;
  const referenceWidth = activeCrop?.cutterWidth || config.cutterWidth || 198;
  const padRatio = width / referenceWidth;
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

      if (activeCrop) {
        // Precise stencil cutout from canvas coordinate mapping
        const { rotation = 0 } = activeCrop;
        const sourceW = img.naturalWidth || img.width || 300;
        const sourceH = img.naturalHeight || img.height || 375;

        let sx: number;
        let sy: number;
        let sWidth: number;
        let sHeight: number;

        if (
          activeCrop.normWidth !== undefined &&
          activeCrop.normHeight !== undefined
        ) {
          sx = (activeCrop.normX ?? 0) * sourceW;
          sy = (activeCrop.normY ?? 0) * sourceH;
          sWidth = activeCrop.normWidth * sourceW;
          sHeight = activeCrop.normHeight * sourceH;
        } else {
          sx = activeCrop.cropX ?? 0;
          sy = activeCrop.cropY ?? 0;
          sWidth = activeCrop.cropWidth ?? sourceW;
          sHeight = activeCrop.cropHeight ?? sourceH;
        }

        // Clamp within source bounds
        sx = Math.max(0, Math.min(sourceW - 1, sx));
        sy = Math.max(0, Math.min(sourceH - 1, sy));
        sWidth = Math.max(1, Math.min(sourceW - sx, sWidth));
        sHeight = Math.max(1, Math.min(sourceH - sy, sHeight));

        const centerX = innerX + innerW / 2;
        const centerY = innerY + innerH / 2;

        ctx.translate(centerX, centerY);
        if (rotation) {
          ctx.rotate((rotation * Math.PI) / 180);
        }

        ctx.drawImage(
          img,
          sx,
          sy,
          sWidth,
          sHeight,
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

  // 6. Typography (Custom text items or legacy labels if explicitly set)
  const monoFont =
    '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const sansFont =
    '"Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const serifFont =
    '"Geist Serif", "Times New Roman", Times, Georgia, serif';

  // A. Render custom text layers added by user after stamping
  if (config.textItems && config.textItems.length > 0) {
    for (const item of config.textItems) {
      if (!item.text.trim()) continue;

      ctx.save();
      ctx.fillStyle = item.color || "#ffffff";

      const textScaleRatio = width / 340;
      const scaledFontSize = Math.max(8, Math.round(item.fontSize * textScaleRatio));
      const chosenFont =
        item.fontFamily === "serif"
          ? serifFont
          : item.fontFamily === "sans"
            ? sansFont
            : monoFont;

      ctx.font = `bold ${scaledFontSize}px ${chosenFont}`;

      const textX = innerX + (item.x / 100) * innerW;
      const textY = innerY + (item.y / 100) * innerH;

      const align: CanvasTextAlign =
        item.align ||
        (item.x > 65 ? "right" : item.x > 35 ? "center" : "left");
      const baseline: CanvasTextBaseline =
        item.y > 65 ? "bottom" : item.y > 35 ? "middle" : "top";

      drawTextWithTracking(
        ctx,
        item.text,
        textX,
        textY,
        scaledFontSize,
        item.fontFamily === "mono" ? 0.08 : 0.02,
        align,
        baseline
      );
      ctx.restore();
    }
  }

  // B. Optional legacy labels (ONLY rendered if explicitly provided and non-empty)
  const countryText = (config.country || "").trim();
  const denomText = (config.denomination || "").trim();
  const subtitleText = (config.subtitle || "").trim();

  if (countryText || denomText || subtitleText) {
    ctx.save();
    ctx.fillStyle = "#ffffff";

    const insetPx = Math.round(10 * padRatio);

    if (countryText) {
      const fontSize = Math.max(6, Math.round(8 * padRatio));
      ctx.font = `bold ${fontSize}px ${monoFont}`;
      drawTextWithTracking(
        ctx,
        countryText.toUpperCase(),
        innerX + insetPx,
        innerY + insetPx,
        fontSize,
        0.12,
        "left",
        "top"
      );
    }

    if (denomText) {
      const fontSize = Math.max(12, Math.round(17 * padRatio));
      ctx.font = `bold ${fontSize}px ${monoFont}`;
      drawTextWithTracking(
        ctx,
        denomText,
        innerX + innerW - insetPx,
        innerY + insetPx,
        fontSize,
        -0.08,
        "right",
        "top"
      );
    }

    if (subtitleText) {
      const fontSize = Math.max(5, Math.round(7 * padRatio));
      ctx.font = `bold ${fontSize}px ${monoFont}`;
      drawTextWithTracking(
        ctx,
        subtitleText.toUpperCase(),
        innerX + insetPx,
        innerY + innerH - insetPx,
        fontSize,
        0.1,
        "left",
        "bottom"
      );
    }
    ctx.restore();
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
  fileName = "postage-stamp.png",
  cropOptions?: CropOptions
): Promise<void> {
  const activeCrop = cropOptions || config.crop;
  const canvas = await renderStampToCanvas(config, 1200, activeCrop);
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
  config: StampConfig,
  cropOptions?: CropOptions
): Promise<boolean> {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  const activeCrop = cropOptions || config.crop;
  const canvas = await renderStampToCanvas(config, 1000, activeCrop);

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
