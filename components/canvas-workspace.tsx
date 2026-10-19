"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Stamp } from "@/components/stamp";
import {
  getStampPadding,
  type StampConfig,
  type CropOptions,
} from "@/lib/stamp-renderer";
import {
  Minus,
  Plus,
  CornersOut,
  HandGrabbing,
  SealCheck,
  Cursor,
  ArrowsOutSimple,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
} from "@phosphor-icons/react";

export type StampCutterState = {
  x: number; // canvas layer px
  y: number; // canvas layer px
  width: number; // canvas layer px
  rotation: number; // degrees
};

export type SnapCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type CanvasWorkspaceProps = {
  config: StampConfig;
  cutter: StampCutterState;
  onChangeCutter: (patch: Partial<StampCutterState>) => void;
  onChangeConfig?: (patch: Partial<StampConfig>) => void;
  onStampOut: (crop: CropOptions) => void;
  onAutoResizeToImage?: (
    mode?: "full" | "corner" | SnapCorner | "half"
  ) => void;
  isStamping?: boolean;
};

type ResizeCorner = "nw" | "ne" | "sw" | "se";

export function CanvasWorkspace({
  config,
  cutter,
  onChangeCutter,
  onChangeConfig,
  onStampOut,
  onAutoResizeToImage,
  isStamping = false,
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Canvas pan & zoom state
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);

  // Tool mode: "select" (drag/resize stamp) vs "pan" (hand grab canvas)
  const [toolMode, setToolMode] = useState<"select" | "pan">("select");
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Stamp cutter dragging state
  const [isDraggingCutter, setIsDraggingCutter] = useState(false);
  const cutterDragStart = useRef<{
    pointerX: number;
    pointerY: number;
    cutterX: number;
    cutterY: number;
  } | null>(null);

  // 4 Corner Resizing state
  const [resizingCorner, setResizingCorner] = useState<ResizeCorner | null>(
    null
  );
  const resizeStartRef = useRef<{
    corner: ResizeCorner;
    pointerX: number;
    pointerY: number;
    cutterX: number;
    cutterY: number;
    cutterWidth: number;
  } | null>(null);

  // Background canvas panning ref
  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    panRef.current = pan;
    zoomRef.current = zoom;
  }, [pan, zoom]);

  // Touch gesture ref (2-finger move/pinch zoom)
  const touchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialCenter: { x: number; y: number };
  }>({
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
  });

  // Image display dimensions on canvas layer
  const imageDisplayWidth = 680;
  const imageDisplayX = 40;
  const imageDisplayY = 40;

  // Aspect ratio height calculation for stamp cutter (fixed standard 4:5 ratio)
  const aspectMultiplier = 5 / 4;
  const cutterHeight = Math.round(cutter.width * aspectMultiplier);

  // Zoom helpers
  const handleZoomIn = () =>
    setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () =>
    setZoom((z) => Math.max(0.25, Math.round((z - 0.15) * 100) / 100));
  const handleResetView = () => {
    setPan({ x: 120, y: 80 });
    setZoom(0.85);
  };

  // Listen for Spacebar to enable temporary Hand / Pan mode (Figma-style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        if (
          ["INPUT", "TEXTAREA"].includes(
            (document.activeElement?.tagName || "").toUpperCase()
          )
        ) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Attach NON-PASSIVE native listeners so e.preventDefault() blocks browser page zoom & scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom
        const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
        const rect = el.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        setZoom((prevZoom) => {
          const nextZoom = Math.min(3.0, Math.max(0.2, prevZoom * zoomFactor));
          const roundedZoom = Math.round(nextZoom * 1000) / 1000;

          setPan((prevPan) => ({
            x: Math.round(
              pointerX - (pointerX - prevPan.x) * (roundedZoom / prevZoom)
            ),
            y: Math.round(
              pointerY - (pointerY - prevPan.y) * (roundedZoom / prevZoom)
            ),
          }));

          return roundedZoom;
        });
      } else {
        // 2-finger pan
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onTouchStart = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        const center = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        touchStateRef.current = {
          initialDistance: Math.max(dist, 1),
          initialZoom: zoomRef.current,
          initialPan: { ...panRef.current },
          initialCenter: center,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        const center = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        const scaleRatio = dist / touchStateRef.current.initialDistance;
        const nextZoom = Math.min(
          3.0,
          Math.max(0.2, touchStateRef.current.initialZoom * scaleRatio)
        );

        const deltaX = center.x - touchStateRef.current.initialCenter.x;
        const deltaY = center.y - touchStateRef.current.initialCenter.y;

        setZoom(Math.round(nextZoom * 100) / 100);
        setPan({
          x: Math.round(touchStateRef.current.initialPan.x + deltaX),
          y: Math.round(touchStateRef.current.initialPan.y + deltaY),
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGesture, { passive: false });
    el.addEventListener("gesturechange", onGesture, { passive: false });
    el.addEventListener("gestureend", onGesture, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGesture);
      el.removeEventListener("gesturechange", onGesture);
      el.removeEventListener("gestureend", onGesture);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Perform Stamp Cutout
  const handlePerformStamp = useCallback(() => {
    const imgEl = imageElementRef.current;
    if (!imgEl) return;

    const naturalW = imgEl.naturalWidth || imageDisplayWidth;
    const naturalH =
      imgEl.naturalHeight || imageDisplayWidth * aspectMultiplier;
    const displayH =
      imgEl.clientHeight ||
      Math.round((naturalH / naturalW) * imageDisplayWidth);

    const scaleX = naturalW / imageDisplayWidth;
    const scaleY = naturalH / displayH;

    const relX = cutter.x - imageDisplayX;
    const relY = cutter.y - imageDisplayY;

    const crop: CropOptions = {
      normX: relX / imageDisplayWidth,
      normY: relY / displayH,
      normWidth: cutter.width / imageDisplayWidth,
      normHeight: cutterHeight / displayH,
      cropX: Math.round(relX * scaleX),
      cropY: Math.round(relY * scaleY),
      cropWidth: Math.round(cutter.width * scaleX),
      cropHeight: Math.round(cutterHeight * scaleY),
      rotation: cutter.rotation,
      cutterWidth: cutter.width,
    };

    onStampOut(crop);
  }, [cutter, cutterHeight, onStampOut, aspectMultiplier]);

  // Auto Resize to fit image (centered 4:5 ratio)
  const handleFitImage = useCallback(() => {
    if (onAutoResizeToImage) {
      onAutoResizeToImage("full");
      return;
    }
    const imgEl = imageElementRef.current;
    const naturalW = imgEl?.naturalWidth || imageDisplayWidth;
    const naturalH =
      imgEl?.naturalHeight ||
      Math.round(imageDisplayWidth * aspectMultiplier);
    const displayH = Math.round((naturalH / naturalW) * imageDisplayWidth);

    const maxFitW = Math.min(
      imageDisplayWidth,
      Math.floor(displayH / aspectMultiplier)
    );
    const maxFitH = Math.round(maxFitW * aspectMultiplier);

    const centerX = Math.round(
      imageDisplayX + (imageDisplayWidth - maxFitW) / 2
    );
    const centerY = Math.round(
      imageDisplayY + (displayH - maxFitH) / 2
    );

    onChangeCutter({
      x: centerX,
      y: centerY,
      width: maxFitW,
      rotation: 0,
    });
    if (onChangeConfig) {
      onChangeConfig({
        aspectRatio: "4/5",
        horizontalPerforations: 12,
        verticalPerforations: 15,
      });
    }
  }, [onAutoResizeToImage, onChangeCutter, onChangeConfig, aspectMultiplier]);

  const handleSnapCorner = useCallback(
    (corner: SnapCorner) => {
      if (onAutoResizeToImage) {
        onAutoResizeToImage(corner);
        return;
      }

      const imgEl = imageElementRef.current;
      const naturalW = imgEl?.naturalWidth || imageDisplayWidth;
      const naturalH =
        imgEl?.naturalHeight ||
        Math.round(imageDisplayWidth * aspectMultiplier);
      const displayH = Math.round((naturalH / naturalW) * imageDisplayWidth);

      const maxFitW = Math.min(
        imageDisplayWidth,
        Math.floor(displayH / aspectMultiplier)
      );

      let targetW = cutter.width;
      if (targetW >= maxFitW * 0.95) {
        targetW = Math.min(maxFitW, Math.round(imageDisplayWidth * 0.5));
      } else {
        targetW = Math.min(targetW, maxFitW);
      }
      targetW = Math.max(80, targetW);
      const targetH = Math.round(targetW * aspectMultiplier);

      let newX = imageDisplayX;
      let newY = imageDisplayY;

      if (corner === "top-right") {
        newX = imageDisplayX + imageDisplayWidth - targetW;
        newY = imageDisplayY;
      } else if (corner === "bottom-left") {
        newX = imageDisplayX;
        newY = imageDisplayY + displayH - targetH;
      } else if (corner === "bottom-right") {
        newX = imageDisplayX + imageDisplayWidth - targetW;
        newY = imageDisplayY + displayH - targetH;
      }

      onChangeCutter({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(targetW),
        rotation: 0,
      });
    },
    [
      cutter.width,
      aspectMultiplier,
      imageDisplayWidth,
      imageDisplayX,
      imageDisplayY,
      onChangeCutter,
      onAutoResizeToImage,
    ]
  );

  // Stamp Cutter Dragging Handlers (clamped to image bounds)
  const handleCutterPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".stamp-corner-handle")) return;

    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setIsDraggingCutter(true);
    cutterDragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      cutterX: cutter.x,
      cutterY: cutter.y,
    };
  };

  const handleCutterPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCutter || !cutterDragStart.current) return;
    const deltaX = (e.clientX - cutterDragStart.current.pointerX) / zoom;
    const deltaY = (e.clientY - cutterDragStart.current.pointerY) / zoom;

    const imgEl = imageElementRef.current;
    const naturalW = imgEl?.naturalWidth || imageDisplayWidth;
    const naturalH =
      imgEl?.naturalHeight ||
      Math.round(imageDisplayWidth * aspectMultiplier);
    const displayH = Math.round((naturalH / naturalW) * imageDisplayWidth);

    const minX = imageDisplayX;
    const maxX = Math.max(
      imageDisplayX,
      imageDisplayX + imageDisplayWidth - cutter.width
    );
    const minY = imageDisplayY;
    const maxY = Math.max(
      imageDisplayY,
      imageDisplayY + displayH - cutterHeight
    );

    const rawX = Math.round(cutterDragStart.current.cutterX + deltaX);
    const rawY = Math.round(cutterDragStart.current.cutterY + deltaY);

    onChangeCutter({
      x: Math.min(maxX, Math.max(minX, rawX)),
      y: Math.min(maxY, Math.max(minY, rawY)),
    });
  };

  const handleCutterPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDraggingCutter(false);
    cutterDragStart.current = null;
  };

  // 4 Corner Square Resize Handlers (clamped to image bounds)
  const handleResizePointerDown = (
    e: React.PointerEvent,
    corner: ResizeCorner
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setResizingCorner(corner);
    resizeStartRef.current = {
      corner,
      pointerX: e.clientX,
      pointerY: e.clientY,
      cutterX: cutter.x,
      cutterY: cutter.y,
      cutterWidth: cutter.width,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizingCorner || !resizeStartRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const { corner, pointerX, pointerY, cutterX, cutterY, cutterWidth } =
      resizeStartRef.current;
    const deltaX = (e.clientX - pointerX) / zoom;
    const deltaY = (e.clientY - pointerY) / zoom;

    const imgEl = imageElementRef.current;
    const naturalW = imgEl?.naturalWidth || imageDisplayWidth;
    const naturalH =
      imgEl?.naturalHeight ||
      Math.round(imageDisplayWidth * aspectMultiplier);
    const displayH = Math.round((naturalH / naturalW) * imageDisplayWidth);

    const imgLeft = imageDisplayX;
    const imgTop = imageDisplayY;
    const imgRight = imageDisplayX + imageDisplayWidth;
    const imgBottom = imageDisplayY + displayH;

    const startH = Math.round(cutterWidth * aspectMultiplier);

    if (corner === "se") {
      const rawChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? deltaX
          : deltaY / aspectMultiplier;
      const maxByRight = imgRight - cutterX;
      const maxByBottom = (imgBottom - cutterY) / aspectMultiplier;
      const maxAllowed = Math.max(
        80,
        Math.floor(Math.min(maxByRight, maxByBottom))
      );
      const newWidth = Math.max(
        80,
        Math.min(maxAllowed, Math.round(cutterWidth + rawChange))
      );
      onChangeCutter({ width: newWidth });
    } else if (corner === "sw") {
      const rawChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? -deltaX
          : deltaY / aspectMultiplier;
      const anchorRight = cutterX + cutterWidth;
      const maxByLeft = anchorRight - imgLeft;
      const maxByBottom = (imgBottom - cutterY) / aspectMultiplier;
      const maxAllowed = Math.max(
        80,
        Math.floor(Math.min(maxByLeft, maxByBottom))
      );
      const newWidth = Math.max(
        80,
        Math.min(maxAllowed, Math.round(cutterWidth + rawChange))
      );
      onChangeCutter({
        x: Math.round(anchorRight - newWidth),
        width: newWidth,
      });
    } else if (corner === "ne") {
      const rawChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? deltaX
          : -deltaY / aspectMultiplier;
      const anchorBottom = cutterY + startH;
      const maxByRight = imgRight - cutterX;
      const maxByTop = (anchorBottom - imgTop) / aspectMultiplier;
      const maxAllowed = Math.max(
        80,
        Math.floor(Math.min(maxByRight, maxByTop))
      );
      const newWidth = Math.max(
        80,
        Math.min(maxAllowed, Math.round(cutterWidth + rawChange))
      );
      const newH = Math.round(newWidth * aspectMultiplier);
      onChangeCutter({
        y: Math.round(anchorBottom - newH),
        width: newWidth,
      });
    } else if (corner === "nw") {
      const rawChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? -deltaX
          : -deltaY / aspectMultiplier;
      const anchorRight = cutterX + cutterWidth;
      const anchorBottom = cutterY + startH;
      const maxByLeft = anchorRight - imgLeft;
      const maxByTop = (anchorBottom - imgTop) / aspectMultiplier;
      const maxAllowed = Math.max(
        80,
        Math.floor(Math.min(maxByLeft, maxByTop))
      );
      const newWidth = Math.max(
        80,
        Math.min(maxAllowed, Math.round(cutterWidth + rawChange))
      );
      const newH = Math.round(newWidth * aspectMultiplier);
      onChangeCutter({
        x: Math.round(anchorRight - newWidth),
        y: Math.round(anchorBottom - newH),
        width: newWidth,
      });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setResizingCorner(null);
    resizeStartRef.current = null;
  };

  // Background pointer events (panning canvas)
  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (
      (e.target as HTMLElement).closest(
        ".stamp-cutter-handle, .canvas-hud, .canvas-bottom-bar, button"
      )
    ) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setIsPanning(true);
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleBackgroundPointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !panStartRef.current) return;
    const deltaX = e.clientX - panStartRef.current.pointerX;
    const deltaY = e.clientY - panStartRef.current.pointerY;
    setPan({
      x: Math.round(panStartRef.current.panX + deltaX),
      y: Math.round(panStartRef.current.panY + deltaY),
    });
  };

  const handleBackgroundPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsPanning(false);
    panStartRef.current = null;
  };



  const cursorClass = isPanning
    ? "cursor-grabbing"
    : isSpacePressed || toolMode === "pan"
      ? "cursor-grab"
      : "cursor-default";

  return (
    <div
      ref={containerRef}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onPointerCancel={handleBackgroundPointerUp}
      data-panning={isPanning}
      className={`canvas-root relative size-full flex-1 touch-none overflow-hidden bg-[#121214] select-none ${cursorClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Canvas Transform Layer */}
      <div
        className="canvas-layer absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          // @ts-expect-error CSS custom property
          "--z": zoom,
        }}
      >
        {/* Source Image Canvas Board */}
        <div
          className="relative rounded-lg shadow-2xl transition-opacity duration-200"
          style={{
            left: `${imageDisplayX}px`,
            top: `${imageDisplayY}px`,
            width: `${imageDisplayWidth}px`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageElementRef}
            src={config.imageUrl}
            alt="Source canvas photo"
            className="pointer-events-none block w-full rounded-sm object-contain opacity-75 select-none"
            draggable={false}
          />
        </div>

        {/* Interactive Stamp Cutter - Drag to position & Drag corners to resize */}
        <div
          onPointerDown={handleCutterPointerDown}
          onPointerMove={handleCutterPointerMove}
          onPointerUp={handleCutterPointerUp}
          onPointerCancel={handleCutterPointerUp}
          className={`stamp-cutter-handle absolute select-none ${
            isDraggingCutter
              ? "z-30 cursor-grabbing"
              : resizingCorner
                ? "z-30"
                : "z-20 cursor-grab"
          } ${
            isStamping
              ? "translate-y-3 scale-90 brightness-90 transition-transform"
              : ""
          }`}
          style={{
            left: `${cutter.x}px`,
            top: `${cutter.y}px`,
            width: `${cutter.width}px`,
            height: `${cutterHeight}px`,
            transform: cutter.rotation
              ? `rotate(${cutter.rotation}deg)`
              : undefined,
            transformOrigin: "center center",
          }}
          title="Drag stamp to position. Drag corners to resize."
        >
          {/* Clean Square Outline Viewfinder (No stamp border) */}
          <div className="relative size-full rounded-[2px] border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_8px_32px_rgba(0,0,0,0.5)]">
            {/* Subtle inner highlight on hover */}
            <div className="size-full bg-white/[0.04] transition-colors hover:bg-white/[0.08]" />

            {/* Subtle center guide crosshair */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
              <div className="h-3 w-px bg-white" />
              <div className="h-px w-3 bg-white" />
            </div>

            {/* Viewfinder dimension badge */}
            <div className="pointer-events-none absolute -top-6 left-0 flex items-center gap-1 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white/90 shadow-sm backdrop-blur-xs">
              <span>{Math.round(cutter.width)} &times; {Math.round(cutterHeight)}</span>
            </div>
          </div>

          {/* 4 Corner Square Resize Handles (NO blue outline box!) */}
          {/* Top-Left (NW) */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "nw")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="stamp-corner-handle absolute -top-2 -left-2 z-40 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-white bg-zinc-900 shadow-md transition-transform hover:scale-125 active:scale-125"
            title="Drag to resize (Top-Left)"
          />

          {/* Top-Right (NE) */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "ne")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="stamp-corner-handle absolute -top-2 -right-2 z-40 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-white bg-zinc-900 shadow-md transition-transform hover:scale-125 active:scale-125"
            title="Drag to resize (Top-Right)"
          />

          {/* Bottom-Left (SW) */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "sw")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="stamp-corner-handle absolute -bottom-2 -left-2 z-40 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-white bg-zinc-900 shadow-md transition-transform hover:scale-125 active:scale-125"
            title="Drag to resize (Bottom-Left)"
          />

          {/* Bottom-Right (SE) */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "se")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="stamp-corner-handle absolute -bottom-2 -right-2 z-40 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-white bg-zinc-900 shadow-md transition-transform hover:scale-125 active:scale-125"
            title="Drag to resize (Bottom-Right)"
          />
        </div>
      </div>

      {/* Top-Right Floating Zoom HUD */}
      <div className="canvas-hud absolute top-4 right-4 z-40 flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/85 px-2.5 py-1 text-xs text-white shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={13} weight="bold" />
        </button>

        <span className="min-w-[36px] text-center font-mono text-[11px] font-semibold text-zinc-200">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={13} weight="bold" />
        </button>

        <i className="mx-0.5 h-3.5 w-px bg-white/20" />

        <button
          type="button"
          onClick={handleResetView}
          className="flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          title="Reset View"
          aria-label="Reset View"
        >
          <CornersOut size={13} />
        </button>
      </div>

      {/* Bottom Center Floating Stamp Bar */}
      <div className="canvas-bottom-bar absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
          <span className="text-zinc-400">Stamp Size</span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono text-zinc-300">{cutter.width}px</span>
        </div>

        <i className="h-3.5 w-px bg-white/20" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setToolMode("select")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors ${
              toolMode === "select"
                ? "bg-white/20 text-white font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Stamp Tool (drag to position, drag corners to resize)"
          >
            <Cursor
              size={13}
              weight={toolMode === "select" ? "fill" : "bold"}
            />
            <span>Stamp</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode("pan")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors ${
              toolMode === "pan"
                ? "bg-white/20 text-white font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Hand Pan Tool (or hold Space to pan)"
          >
            <HandGrabbing
              size={13}
              weight={toolMode === "pan" ? "fill" : "regular"}
            />
            <span>Pan</span>
          </button>
        </div>

        <i className="h-3.5 w-px bg-white/20" />

        {/* Auto Fit & 4 Corners Alignment */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFitImage}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
            title="Auto resize stamp to fit entire image"
          >
            <ArrowsOutSimple size={13} weight="bold" />
            <span>Fit Image</span>
          </button>

          <span className="text-zinc-600">·</span>

          <div
            className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5"
            title="Snap stamp to image corners"
          >
            <button
              type="button"
              onClick={() => handleSnapCorner("top-left")}
              className="flex size-6 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/20 hover:text-white active:scale-95"
              title="Snap to Top-Left corner"
              aria-label="Snap to Top-Left corner"
            >
              <ArrowUpLeft size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => handleSnapCorner("top-right")}
              className="flex size-6 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/20 hover:text-white active:scale-95"
              title="Snap to Top-Right corner"
              aria-label="Snap to Top-Right corner"
            >
              <ArrowUpRight size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => handleSnapCorner("bottom-left")}
              className="flex size-6 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/20 hover:text-white active:scale-95"
              title="Snap to Bottom-Left corner"
              aria-label="Snap to Bottom-Left corner"
            >
              <ArrowDownLeft size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => handleSnapCorner("bottom-right")}
              className="flex size-6 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-white/20 hover:text-white active:scale-95"
              title="Snap to Bottom-Right corner"
              aria-label="Snap to Bottom-Right corner"
            >
              <ArrowDownRight size={13} weight="bold" />
            </button>
          </div>
        </div>

        <i className="h-3.5 w-px bg-white/20" />

        {/* Quick Stamp Action */}
        <button
          type="button"
          onClick={handlePerformStamp}
          disabled={isStamping}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
          title="Punch Stamp"
        >
          <SealCheck size={15} weight="fill" />
          <span>Stamp!</span>
        </button>
      </div>
    </div>
  );
}
