"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Stamp } from "@/components/stamp";
import { Postmark } from "@/components/postmark";
import type { StampConfig, CropOptions } from "@/lib/stamp-renderer";
import {
  Minus,
  Plus,
  CornersOut,
  Eye,
  EyeSlash,
  HandGrabbing,
  SealCheck,
  Lightbulb,
  Cursor,
} from "@phosphor-icons/react";

export type StampCutterState = {
  x: number; // canvas layer px
  y: number; // canvas layer px
  width: number; // canvas layer px
  rotation: number; // degrees
};

export type CanvasWorkspaceProps = {
  config: StampConfig;
  cutter: StampCutterState;
  onChangeCutter: (patch: Partial<StampCutterState>) => void;
  onStampOut: (crop: CropOptions) => void;
  isStamping?: boolean;
};

export function CanvasWorkspace({
  config,
  cutter,
  onChangeCutter,
  onStampOut,
  isStamping = false,
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Canvas pan & zoom state
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showTour, setShowTour] = useState(false);

  // Tool mode: "select" (draw marquee .canvas-band to place cutter) vs "pan" (hand grab)
  const [toolMode, setToolMode] = useState<"select" | "pan">("select");
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Selection marquee band state (.canvas-band)
  const [selectionBand, setSelectionBand] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [isSelectingBand, setIsSelectingBand] = useState(false);

  // Stamp cutter dragging & resizing
  const [isDraggingCutter, setIsDraggingCutter] = useState(false);
  const cutterDragStart = useRef<{
    pointerX: number;
    pointerY: number;
    cutterX: number;
    cutterY: number;
  } | null>(null);

  type ResizeCorner = "nw" | "ne" | "sw" | "se";
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

  // Multi-touch gestures ref (2-finger move/pinch zoom, 3-finger select drag)
  const touchStateRef = useRef<{
    mode: "none" | "pan-zoom" | "band";
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialCenter: { x: number; y: number };
    bandStart: { x: number; y: number };
  }>({
    mode: "none",
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
    bandStart: { x: 0, y: 0 },
  });

  // Image display dimensions on canvas layer
  const imageDisplayWidth = 680;
  const imageDisplayX = 40;
  const imageDisplayY = 40;

  // Aspect ratio height calculation for stamp cutter
  const getAspectMultiplier = useCallback((ar: string) => {
    if (ar === "1/1") return 1;
    if (ar === "5/4") return 4 / 5;
    if (ar === "3/4") return 4 / 3;
    return 5 / 4; // 4/5 portrait
  }, []);

  const aspectMultiplier = getAspectMultiplier(config.aspectRatio);
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

  // Convert selection band coordinates to canvas cutter placement
  const applySelectionBand = useCallback(
    (band: {
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }) => {
      const left = Math.min(band.startX, band.currentX);
      const top = Math.min(band.startY, band.currentY);
      const width = Math.abs(band.currentX - band.startX);
      const height = Math.abs(band.currentY - band.startY);

      // Only update cutter if user made a meaningful selection (> 20px)
      if (width > 20 && height > 20) {
        const canvasX = Math.round((left - panRef.current.x) / zoomRef.current);
        const canvasY = Math.round((top - panRef.current.y) / zoomRef.current);
        const canvasWidth = Math.round(width / zoomRef.current);

        onChangeCutter({
          x: canvasX,
          y: canvasY,
          width: Math.max(120, Math.min(600, canvasWidth)),
        });
      }
    },
    [onChangeCutter]
  );

  // Attach NON-PASSIVE native listeners so e.preventDefault() blocks browser page zoom & scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Crucial: stop browser default page-level zoom & trackpad swipe navigation
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // 2-finger pinch apart to zoom (or Ctrl + mouse wheel)
        const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
        const rect = el.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        setZoom((prevZoom) => {
          const nextZoom = Math.min(3.0, Math.max(0.2, prevZoom * zoomFactor));
          const roundedZoom = Math.round(nextZoom * 1000) / 1000;

          // Keep pointer position fixed during zoom
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
        // 2-finger drag to move / pan canvas-layer
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    // Safari WebKit gesture prevention (stops Safari page zoom)
    const onGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Touch gesture handling: 2-finger move & pinch zoom, 3-finger select drag
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
          mode: "pan-zoom",
          initialDistance: Math.max(dist, 1),
          initialZoom: zoomRef.current,
          initialPan: { ...panRef.current },
          initialCenter: center,
          bandStart: { x: 0, y: 0 },
        };
        setSelectionBand(null);
      } else if (e.touches.length === 3) {
        e.preventDefault();
        e.stopPropagation();
        const t = e.touches[0];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;

        touchStateRef.current = {
          mode: "band",
          initialDistance: 0,
          initialZoom: zoomRef.current,
          initialPan: { ...panRef.current },
          initialCenter: { x: 0, y: 0 },
          bandStart: { x, y },
        };

        setSelectionBand({
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();

      if (e.touches.length === 2 && touchStateRef.current.mode === "pan-zoom") {
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
      } else if (
        e.touches.length === 3 &&
        touchStateRef.current.mode === "band"
      ) {
        e.preventDefault();
        e.stopPropagation();
        const t = e.touches[0];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;

        setSelectionBand({
          startX: touchStateRef.current.bandStart.x,
          startY: touchStateRef.current.bandStart.y,
          currentX: x,
          currentY: y,
        });
      }
    };

    const onTouchEnd = () => {
      if (touchStateRef.current.mode === "band") {
        setSelectionBand((curr) => {
          if (curr) applySelectionBand(curr);
          return null;
        });
      }
      touchStateRef.current.mode = "none";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGesture, { passive: false });
    el.addEventListener("gesturechange", onGesture, { passive: false });
    el.addEventListener("gestureend", onGesture, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGesture);
      el.removeEventListener("gesturechange", onGesture);
      el.removeEventListener("gestureend", onGesture);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applySelectionBand]);

  // Background pointer events (supports mouse click-drag and macOS 3-finger drag)
  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (
      (e.target as HTMLElement).closest(
        ".stamp-cutter-handle, .canvas-hud, .tour-dock"
      )
    ) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    // Pan if Spacebar held, middle-click, or in pan mode
    if (isSpacePressed || e.button === 1 || toolMode === "pan") {
      setIsPanning(true);
      panStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else {
      // 3-finger drag or marquee select drag (.canvas-band)
      setIsSelectingBand(true);
      setSelectionBand({
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
      });
    }
  };

  const handleBackgroundPointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning && panStartRef.current) {
      const deltaX = e.clientX - panStartRef.current.pointerX;
      const deltaY = e.clientY - panStartRef.current.pointerY;
      setPan({
        x: Math.round(panStartRef.current.panX + deltaX),
        y: Math.round(panStartRef.current.panY + deltaY),
      });
    } else if (isSelectingBand && selectionBand) {
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      setSelectionBand((prev) =>
        prev
          ? {
              ...prev,
              currentX: clientX,
              currentY: clientY,
            }
          : null
      );
    }
  };

  const handleBackgroundPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (isSelectingBand && selectionBand) {
      applySelectionBand(selectionBand);
    }

    setIsPanning(false);
    setIsSelectingBand(false);
    setSelectionBand(null);
    panStartRef.current = null;
  };

  // Stamp cutter dragging over the image
  const handleCutterPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
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
    onChangeCutter({
      x: Math.round(cutterDragStart.current.cutterX + deltaX),
      y: Math.round(cutterDragStart.current.cutterY + deltaY),
    });
  };

  const handleCutterPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDraggingCutter(false);
    cutterDragStart.current = null;
  };

  // Stamp cutter corner resizing handlers
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

    let widthChange = 0;
    if (corner === "se") {
      widthChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? deltaX
          : deltaY / aspectMultiplier;
      const newWidth = Math.max(
        100,
        Math.min(700, Math.round(cutterWidth + widthChange))
      );
      onChangeCutter({ width: newWidth });
    } else if (corner === "sw") {
      widthChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? -deltaX
          : deltaY / aspectMultiplier;
      const newWidth = Math.max(
        100,
        Math.min(700, Math.round(cutterWidth + widthChange))
      );
      const actualDeltaW = newWidth - cutterWidth;
      onChangeCutter({
        x: Math.round(cutterX - actualDeltaW),
        width: newWidth,
      });
    } else if (corner === "ne") {
      widthChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? deltaX
          : -deltaY / aspectMultiplier;
      const newWidth = Math.max(
        100,
        Math.min(700, Math.round(cutterWidth + widthChange))
      );
      const actualDeltaW = newWidth - cutterWidth;
      const deltaH = actualDeltaW * aspectMultiplier;
      onChangeCutter({
        y: Math.round(cutterY - deltaH),
        width: newWidth,
      });
    } else if (corner === "nw") {
      widthChange =
        Math.abs(deltaX) > Math.abs(deltaY / aspectMultiplier)
          ? -deltaX
          : -deltaY / aspectMultiplier;
      const newWidth = Math.max(
        100,
        Math.min(700, Math.round(cutterWidth + widthChange))
      );
      const actualDeltaW = newWidth - cutterWidth;
      const deltaH = actualDeltaW * aspectMultiplier;
      onChangeCutter({
        x: Math.round(cutterX - actualDeltaW),
        y: Math.round(cutterY - deltaH),
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

  // Perform Stamp Cutout
  const handlePerformStamp = () => {
    const imgEl = imageElementRef.current;
    if (!imgEl) return;

    const naturalW = imgEl.naturalWidth || imageDisplayWidth;
    const naturalH =
      imgEl.naturalHeight || imageDisplayWidth * aspectMultiplier;
    const displayH = (naturalH / naturalW) * imageDisplayWidth;

    // Inner crop area of stamp cutter (inset by padding)
    const padding = config.padding;
    const innerX = cutter.x + padding;
    const innerY = cutter.y + padding;
    const innerW = cutter.width - padding * 2;
    const innerH = cutterHeight - padding * 2;

    // Map canvas coordinates to original image pixels
    const scaleX = naturalW / imageDisplayWidth;
    const scaleY = naturalH / displayH;

    const relX = innerX - imageDisplayX;
    const relY = innerY - imageDisplayY;

    const crop: CropOptions = {
      cropX: Math.round(relX * scaleX),
      cropY: Math.round(relY * scaleY),
      cropWidth: Math.round(innerW * scaleX),
      cropHeight: Math.round(innerH * scaleY),
      rotation: cutter.rotation,
    };

    onStampOut(crop);
  };

  // Filter effect style
  let filterStyle = "";
  if (config.filter === "vintage")
    filterStyle = "contrast(1.3) sepia(0.35) grayscale(0.2)";
  else if (config.filter === "sepia")
    filterStyle = "sepia(0.85) contrast(1.15) brightness(0.95)";
  else if (config.filter === "cyanotype")
    filterStyle = "contrast(1.4) hue-rotate(180deg) saturate(1.8)";
  else if (config.filter === "monochrome")
    filterStyle = "grayscale(1) contrast(1.35)";

  // Offset of image inside the stamp window so it aligns seamlessly with canvas background
  const stampPadding = config.padding;
  const innerWindowLeft = cutter.x + stampPadding;
  const innerWindowTop = cutter.y + stampPadding;
  const innerWindowWidth = Math.max(10, cutter.width - stampPadding * 2);
  const innerWindowHeight = Math.max(10, cutterHeight - stampPadding * 2);

  const innerImageOffsetX = imageDisplayX - innerWindowLeft;
  const innerImageOffsetY = imageDisplayY - innerWindowTop;

  // Active selection box geometry
  const bandBox = selectionBand
    ? {
        left: Math.min(selectionBand.startX, selectionBand.currentX),
        top: Math.min(selectionBand.startY, selectionBand.currentY),
        width: Math.abs(selectionBand.currentX - selectionBand.startX),
        height: Math.abs(selectionBand.currentY - selectionBand.startY),
      }
    : null;

  // Cursor style based on current tool mode and keys
  const cursorClass =
    isPanning || isDraggingCutter
      ? "cursor-grabbing"
      : isSpacePressed || toolMode === "pan"
        ? "cursor-grab"
        : "cursor-crosshair";

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
            className="pointer-events-none block w-full rounded-sm object-contain select-none"
            style={{
              filter: filterStyle || undefined,
              opacity: showOutlines ? 0.65 : 0.95,
            }}
            draggable={false}
          />

          {/* Canvas Board Dimensions Label */}
          <div className="pointer-events-none absolute -top-6 left-0 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
            <span>IMAGE CANVAS</span>
            <span>·</span>
            <span>{imageDisplayWidth}px</span>
          </div>
        </div>

        {/* Interactive Stamp Cutter Punch Tool */}
        <div
          onPointerDown={handleCutterPointerDown}
          onPointerMove={handleCutterPointerMove}
          onPointerUp={handleCutterPointerUp}
          onPointerCancel={handleCutterPointerUp}
          className={`stamp-cutter-handle absolute transition-transform select-none ${
            isDraggingCutter
              ? "z-30 cursor-grabbing"
              : resizingCorner
                ? "z-30"
                : "z-20 cursor-grab"
          } ${
            isStamping
              ? "translate-y-3 scale-90 brightness-90"
              : "scale-100 hover:scale-[1.01]"
          }`}
          style={{
            left: `${cutter.x}px`,
            top: `${cutter.y}px`,
            width: `${cutter.width}px`,
            height: `${cutterHeight}px`,
            transform: `rotate(${cutter.rotation}deg)`,
            transformOrigin: "center center",
          }}
          title="Drag stamp frame to cut out any region of the image"
        >
          {/* Stamp Component Frame */}
          <Stamp
            paper={config.paperColor}
            ink={config.inkColor}
            padding={config.padding}
            horizontalPerforations={config.horizontalPerforations}
            verticalPerforations={config.verticalPerforations}
            perforationDepth={config.perforationDepth}
            className="size-full shadow-2xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
            contentClassName="rounded-xs overflow-hidden"
          >
            {/* The Stencil Cutout Window: Image rendered exactly at relative offset */}
            <div
              className="relative size-full overflow-hidden"
              style={{
                width: `${innerWindowWidth}px`,
                height: `${innerWindowHeight}px`,
                backgroundColor: config.paperColor,
              }}
            >
              {/* Seamlessly aligned underlying image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.imageUrl}
                alt="Stamp viewport"
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  left: `${innerImageOffsetX}px`,
                  top: `${innerImageOffsetY}px`,
                  width: `${imageDisplayWidth}px`,
                  filter: filterStyle || undefined,
                  opacity: 1,
                }}
                draggable={false}
              />

              {/* Inner decorative vintage stamp border */}
              <div
                className="pointer-events-none absolute inset-0 border-2"
                style={{ borderColor: config.inkColor }}
              />
              <div
                className="pointer-events-none absolute inset-[5px] border border-dashed opacity-75"
                style={{ borderColor: config.inkColor }}
              />

              {/* Country Ribbon */}
              {config.country.trim() && (
                <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                  <span
                    className="border px-2.5 py-0.5 text-[11px] font-bold tracking-widest uppercase shadow-xs"
                    style={{
                      backgroundColor: config.paperColor,
                      color: config.inkColor,
                      borderColor: config.inkColor,
                      fontFamily: 'serif, Georgia, "Times New Roman"',
                    }}
                  >
                    {config.country}
                  </span>
                </div>
              )}

              {/* Denomination Badge */}
              {config.denomination.trim() && (
                <div className="pointer-events-none absolute right-2 bottom-2 flex">
                  <span
                    className="min-w-[28px] border px-1.5 py-0.5 text-center font-mono text-[12px] font-black tracking-tight shadow-xs"
                    style={{
                      backgroundColor: config.paperColor,
                      color: config.inkColor,
                      borderColor: config.inkColor,
                      fontFamily: "monospace, sans-serif",
                    }}
                  >
                    {config.denomination}
                  </span>
                </div>
              )}

              {/* Subtitle */}
              {config.subtitle?.trim() && (
                <div className="pointer-events-none absolute bottom-2 left-2 flex">
                  <span
                    className="px-1.5 py-0.5 font-sans text-[8px] font-bold tracking-wider uppercase opacity-90"
                    style={{
                      color: config.inkColor,
                      fontFamily: "sans-serif",
                    }}
                  >
                    {config.subtitle}
                  </span>
                </div>
              )}

              {/* Postmark cancellation mark overlay */}
              {config.enablePostmark && (
                <Postmark
                  style={config.postmarkStyle}
                  city={config.postmarkCity}
                  date={config.postmarkDate}
                  inkColor={config.postmarkColor}
                  rotation={config.postmarkRotation}
                />
              )}
            </div>
          </Stamp>

          {/* Bounding Outline & 4 Corner Resize Handles */}
          {showOutlines && (
            <>
              {/* Crisp bounding outline box */}
              <div
                className="pointer-events-none absolute -inset-1 rounded-sm border border-blue-500/80 shadow-xs"
                style={{
                  outline: "1px dashed rgba(59, 130, 246, 0.4)",
                  outlineOffset: "2px",
                }}
              />

              {/* 4 Corner Squares to Drag & Resize */}
              {/* Top-Left (NW) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, "nw")}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                className="absolute -top-2.5 -left-2.5 z-40 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-blue-500 bg-white shadow-md transition-transform hover:scale-125 active:scale-125"
                title="Drag to resize stamp (Top-Left)"
              />

              {/* Top-Right (NE) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, "ne")}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                className="absolute -top-2.5 -right-2.5 z-40 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-blue-500 bg-white shadow-md transition-transform hover:scale-125 active:scale-125"
                title="Drag to resize stamp (Top-Right)"
              />

              {/* Bottom-Left (SW) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, "sw")}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                className="absolute -bottom-2.5 -left-2.5 z-40 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-blue-500 bg-white shadow-md transition-transform hover:scale-125 active:scale-125"
                title="Drag to resize stamp (Bottom-Left)"
              />

              {/* Bottom-Right (SE) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, "se")}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                className="absolute -right-2.5 -bottom-2.5 z-40 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-blue-500 bg-white shadow-md transition-transform hover:scale-125 active:scale-125"
                title="Drag to resize stamp (Bottom-Right)"
              />

              {/* Size Pill */}
              <div className="pointer-events-none absolute inset-x-0 -bottom-8 flex justify-center">
                <span className="flex items-center gap-1.5 rounded-full bg-black/85 px-2.5 py-0.5 font-mono text-[10px] font-medium text-white shadow-lg backdrop-blur-xs">
                  <span>
                    {cutter.width} × {cutterHeight}px
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-300">Drag corners to resize</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selection Marquee Band (.canvas-band) */}
      {bandBox && (
        <div
          className="canvas-band"
          style={{
            left: `${bandBox.left}px`,
            top: `${bandBox.top}px`,
            width: `${bandBox.width}px`,
            height: `${bandBox.height}px`,
          }}
        />
      )}

      {/* Top-Right Floating Zoom HUD matching reference */}
      <div className="canvas-hud absolute top-4 right-4 z-40 flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/85 px-2.5 py-1 text-xs text-white shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomOut}
          className="hud-btn flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={13} weight="bold" />
        </button>

        <span className="hud-val min-w-[36px] text-center font-mono text-[11px] font-semibold text-zinc-200">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="hud-btn flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={13} weight="bold" />
        </button>

        <i className="hud-split mx-0.5 h-3.5 w-px bg-white/20" />

        <button
          type="button"
          onClick={handleResetView}
          className="hud-btn flex size-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          title="Reset View"
          aria-label="Reset View"
        >
          <CornersOut size={13} />
        </button>
      </div>

      {/* Bottom Center Floating Selection & Tool Bar */}
      <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
          <span className="text-zinc-400">Stamp Cutter</span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono text-zinc-400">
            {cutter.width}×{cutterHeight}px
          </span>
        </div>

        <i className="h-3.5 w-px bg-white/20" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setToolMode("select")}
            className={`flex size-6 items-center justify-center rounded-lg transition-colors ${
              toolMode === "select"
                ? "bg-white/20 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Selection Drag Tool"
          >
            <Cursor
              size={13}
              weight={toolMode === "select" ? "fill" : "bold"}
            />
          </button>
          <button
            type="button"
            onClick={() => setToolMode("pan")}
            className={`flex size-6 items-center justify-center rounded-lg transition-colors ${
              toolMode === "pan"
                ? "bg-white/20 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Hand Pan Tool (or hold Space to pan)"
          >
            <HandGrabbing
              size={13}
              weight={toolMode === "pan" ? "fill" : "regular"}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowOutlines((prev) => !prev)}
            className={`flex size-6 items-center justify-center rounded-lg transition-colors ${
              showOutlines
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
            title={showOutlines ? "Hide outlines" : "Show outlines"}
          >
            {showOutlines ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        </div>

        <i className="h-3.5 w-px bg-white/20" />

        {/* Quick Stamp Action */}
        <button
          type="button"
          onClick={handlePerformStamp}
          disabled={isStamping}
          className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95"
          title="Punch Stamp (Stamp Out)"
        >
          <SealCheck size={14} weight="fill" />
          <span>Stamp</span>
        </button>
      </div>

      {/* Tour Dock & Help Popover (Bottom-Left matching reference) */}
      <div className="tour-dock absolute bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setShowTour((prev) => !prev)}
          className="tour-lamp relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/85 text-amber-400 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-800 active:scale-95"
          data-new="true"
          aria-expanded={showTour}
          title="Show me around"
          aria-label="Show me around"
        >
          <Lightbulb size={17} weight={showTour ? "fill" : "regular"} />
          <span className="absolute top-1.5 right-1.5 size-1.5 animate-pulse rounded-full bg-blue-500" />
        </button>

        {showTour && (
          <div className="absolute bottom-12 left-0 w-80 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-xs text-zinc-300 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Lightbulb size={16} className="text-amber-400" weight="fill" />
                Gestures & Shortcuts Guide
              </span>
              <button
                type="button"
                onClick={() => setShowTour(false)}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2 text-[11px] text-zinc-400">
              <li className="flex gap-2">
                <span className="font-bold text-blue-400">✦</span>
                <span>
                  <strong className="text-zinc-200">
                    3-Finger / Click Drag:
                  </strong>{" "}
                  Draws the <code className="text-blue-400">.canvas-band</code>{" "}
                  selection box to immediately frame the stamp cutter.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-400">✦</span>
                <span>
                  <strong className="text-zinc-200">2-Finger Drag:</strong> Pan
                  and move the canvas smoothly in any direction.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-400">✦</span>
                <span>
                  <strong className="text-zinc-200">2-Finger Apart:</strong>{" "}
                  Pinch to zoom in and out centered on your cursor.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-400">✦</span>
                <span>
                  <strong className="text-zinc-200">Spacebar:</strong> Hold
                  Spacebar anytime to temporarily switch to Hand pan mode.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
