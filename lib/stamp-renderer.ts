import { getStampPoints } from "@/components/stamp";
import type { PostmarkStyle } from "@/components/postmark";
export type { PostmarkStyle };

export type StampFilter =
  "none" | "vintage" | "sepia" | "cyanotype" | "monochrome";

export type StampConfig = {
  // Image
  imageUrl: string;
  panX: number; // in percentage of inner frame
  panY: number;
  zoom: number; // 1 = 100%
  rotation: number; // degrees
  filter: StampFilter;

  // Frame
  aspectRatio: "4/5" | "1/1" | "5/4" | "3/4";
  paperColor: string;
  inkColor: string;
  padding: number;
  horizontalPerforations: number;
  verticalPerforations: number;
  perforationDepth: number;

  // Postal text
  country: string;
  denomination: string;
  subtitle?: string;

  // Postmark
  enablePostmark: boolean;
  postmarkStyle: PostmarkStyle;
  postmarkCity: string;
  postmarkDate: string;
  postmarkColor: string;
  postmarkRotation: number;
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

  const cutterHeight = Math.round(cutter.width * aspectMultiplier);
  const naturalW = naturalWidth || imageDisplayWidth;
  const naturalH = naturalHeight || imageDisplayWidth * aspectMultiplier;
  const displayH = (naturalH / naturalW) * imageDisplayWidth;

  const padding = config.padding;
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

  const width = targetWidth;
  const height = Math.round(targetWidth * aspectMultiplier);

  canvas.width = width;
  canvas.height = height;

  // 1. Clip to stamp perforations
  const points = getStampPoints({
    depth: config.perforationDepth,
    horizontalCount: config.horizontalPerforations,
    verticalCount: config.verticalPerforations,
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

  // 2. Paper background & gradient highlight
  ctx.fillStyle = config.paperColor;
  ctx.fillRect(0, 0, width, height);

  const bgGrad = ctx.createLinearGradient(0, 0, width * 0.7, height * 0.7);
  bgGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  bgGrad.addColorStop(0.42, "transparent");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Inner frame content
  // Scale padding proportionally (default 13px at 224px width -> ~58px at 1000px)
  const padRatio = width / 224;
  const paddingPx = Math.round(config.padding * padRatio);

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
      ctx.fillStyle = config.paperColor;
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // Apply CSS-like canvas filters defensively (Safari fallback)
      try {
        if ("filter" in ctx) {
          if (config.filter === "vintage") {
            ctx.filter = "contrast(1.3) sepia(0.35) grayscale(0.2)";
          } else if (config.filter === "sepia") {
            ctx.filter = "sepia(0.85) contrast(1.15) brightness(0.95)";
          } else if (config.filter === "cyanotype") {
            ctx.filter = "contrast(1.4) hue-rotate(180deg) saturate(1.8)";
          } else if (config.filter === "monochrome") {
            ctx.filter = "grayscale(1) contrast(1.35)";
          } else {
            ctx.filter = "none";
          }
        }
      } catch {
        // Fallback for browsers that restrict canvas filter
      }

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
        // Standard centered pan/zoom drawing
        const centerX = innerX + innerW / 2 + (config.panX / 100) * innerW;
        const centerY = innerY + innerH / 2 + (config.panY / 100) * innerH;

        ctx.translate(centerX, centerY);
        ctx.rotate((config.rotation * Math.PI) / 180);

        const imgAspect = img.width / img.height;
        const innerAspect = innerW / innerH;
        let drawW: number;
        let drawH: number;

        if (imgAspect > innerAspect) {
          drawH = innerH * config.zoom;
          drawW = drawH * imgAspect;
        } else {
          drawW = innerW * config.zoom;
          drawH = drawW / imgAspect;
        }

        if (
          Number.isFinite(drawW) &&
          Number.isFinite(drawH) &&
          drawW > 0 &&
          drawH > 0
        ) {
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      }

      ctx.restore();
    } catch {
      // Fallback placeholder pattern if image fails to load
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(innerX, innerY, innerW, innerH);
    }
  }

  // 5. Authentic stamp decorative borders inside inner rect
  ctx.save();
  const strokeW = Math.max(2, Math.round(2 * padRatio));
  ctx.strokeStyle = config.inkColor;
  ctx.lineWidth = strokeW;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // Inner dashed hairline
  const innerMargin = Math.round(6 * padRatio);
  if (innerW > innerMargin * 2 && innerH > innerMargin * 2) {
    ctx.lineWidth = Math.max(1, Math.round(1 * padRatio));
    ctx.setLineDash([4 * padRatio, 3 * padRatio]);
    ctx.strokeRect(
      innerX + innerMargin,
      innerY + innerMargin,
      innerW - innerMargin * 2,
      innerH - innerMargin * 2
    );
    ctx.setLineDash([]);
  }

  // 6. Postal Typography
  // Top Header Banner (Country)
  if (config.country.trim()) {
    const fontSize = Math.round(13 * padRatio);
    ctx.font = `bold ${fontSize}px serif, Georgia, "Times New Roman"`;
    ctx.fillStyle = config.inkColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Text ribbon background plate
    const text = config.country.toUpperCase();
    const textWidth = ctx.measureText(text).width + 24 * padRatio;
    const bannerH = fontSize + 8 * padRatio;
    const bannerY = innerY + innerMargin + 4 * padRatio;

    ctx.fillStyle = config.paperColor;
    ctx.fillRect(width / 2 - textWidth / 2, bannerY, textWidth, bannerH);
    ctx.strokeStyle = config.inkColor;
    ctx.lineWidth = 1 * padRatio;
    ctx.strokeRect(width / 2 - textWidth / 2, bannerY, textWidth, bannerH);

    ctx.fillStyle = config.inkColor;
    ctx.fillText(text, width / 2, bannerY + 4 * padRatio);
  }

  // Corner Denomination Badge
  if (config.denomination.trim()) {
    const denomFont = Math.round(15 * padRatio);
    ctx.font = `900 ${denomFont}px monospace, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const badgeW = Math.round(36 * padRatio);
    const badgeH = Math.round(26 * padRatio);
    const badgeX = innerX + innerW - innerMargin - badgeW - 2 * padRatio;
    const badgeY = innerY + innerH - innerMargin - badgeH - 2 * padRatio;

    ctx.fillStyle = config.paperColor;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = config.inkColor;
    ctx.lineWidth = 1.5 * padRatio;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = config.inkColor;
    ctx.fillText(config.denomination, badgeX + badgeW / 2, badgeY + badgeH / 2);
  }

  // Subtitle / Footer
  if (config.subtitle?.trim()) {
    const subFont = Math.round(9 * padRatio);
    ctx.font = `bold ${subFont}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = config.inkColor;
    ctx.fillText(
      config.subtitle.toUpperCase(),
      innerX + innerMargin + 4 * padRatio,
      innerY + innerH - innerMargin - 6 * padRatio
    );
  }

  // 7. Postmark cancellation stamp overlay
  if (config.enablePostmark) {
    drawPostmarkOnCanvas(ctx, config, width, height, padRatio);
  }

  ctx.restore(); // Restore outer clip
  return canvas;
}

/**
 * Draws the cancellation rubber postmark directly onto the 2D canvas context
 */
function drawPostmarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  config: StampConfig,
  width: number,
  height: number,
  padRatio: number
) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((config.postmarkRotation * Math.PI) / 180);
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = config.postmarkColor;
  ctx.fillStyle = config.postmarkColor;
  ctx.globalAlpha = 0.85;

  const scale = padRatio;
  ctx.scale(scale, scale);

  if (config.postmarkStyle === "classic-wavy") {
    // Circle dial
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-40, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(-40, 0, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text in circle
    ctx.font = "bold 9px monospace, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.postmarkCity.toUpperCase(), -40, -22);

    ctx.font = "900 11px monospace, sans-serif";
    ctx.fillText(config.postmarkDate, -40, 0);

    ctx.font = "bold 8px monospace, sans-serif";
    ctx.fillText("★ POSTE ★", -40, 22);

    // Wavy lines
    ctx.lineWidth = 2.2;
    const waveYOffsets = [-40, -26, -12, 2, 16, 30, 44];
    for (const wy of waveYOffsets) {
      ctx.beginPath();
      ctx.moveTo(15, wy);
      ctx.quadraticCurveTo(45, wy - 10, 75, wy);
      ctx.quadraticCurveTo(105, wy + 10, 135, wy);
      ctx.quadraticCurveTo(165, wy - 10, 195, wy);
      ctx.stroke();
    }
  } else if (config.postmarkStyle === "double-circle") {
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "bold 10px monospace, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.postmarkCity.toUpperCase(), 0, -26);

    ctx.beginPath();
    ctx.moveTo(-45, -12);
    ctx.lineTo(45, -12);
    ctx.moveTo(-45, 12);
    ctx.lineTo(45, 12);
    ctx.stroke();

    ctx.font = "900 13px monospace, sans-serif";
    ctx.fillText(config.postmarkDate, 0, 0);

    ctx.font = "bold 9px monospace, sans-serif";
    ctx.fillText("OFFICIAL MAIL", 0, 26);
  } else if (config.postmarkStyle === "airmail-triangle") {
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(65, 50);
    ctx.lineTo(-65, 50);
    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(52, 42);
    ctx.lineTo(-52, 42);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "900 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AIR MAIL", 0, -15);

    ctx.font = "bold 8.5px monospace, sans-serif";
    ctx.fillText(config.postmarkCity.toUpperCase(), 0, 5);

    ctx.font = "900 10.5px monospace, sans-serif";
    ctx.fillText(config.postmarkDate, 0, 24);
  } else if (config.postmarkStyle === "bars-only") {
    ctx.lineWidth = 3;
    const waveYOffsets = [-50, -30, -10, 10, 30, 50];
    for (const wy of waveYOffsets) {
      ctx.beginPath();
      ctx.moveTo(-90, wy);
      ctx.quadraticCurveTo(-45, wy - 12, 0, wy);
      ctx.quadraticCurveTo(45, wy + 12, 90, wy);
      ctx.stroke();
    }
  }

  ctx.restore();
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
