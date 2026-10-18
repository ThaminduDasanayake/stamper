"use client";

import React, { useRef, useState } from "react";
import { Stamp } from "@/components/stamp";
import { Postmark } from "@/components/postmark";
import type { StampConfig } from "@/lib/stamp-renderer";
import { HandGrabbing } from "@phosphor-icons/react";

export type StampPreviewProps = {
  config: StampConfig;
  onChangePan: (panX: number, panY: number) => void;
  isStamping?: boolean;
};

export function StampPreview({
  config,
  onChangePan,
  isStamping = false,
}: StampPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  // Modern-web-guidance drag pattern:
  // Primary pointer button only, pointer capture, touch-action: none, user-select: none
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary button
    e.preventDefault();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: config.panX,
      initialPanY: config.panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Convert pixel delta to percentage of frame
    const percentDeltaX = (deltaX / rect.width) * 100;
    const percentDeltaY = (deltaY / rect.height) * 100;

    // Clamp pan between -100% and 100%
    const nextPanX = Math.min(
      Math.max(dragStartRef.current.initialPanX + percentDeltaX, -100),
      100
    );
    const nextPanY = Math.min(
      Math.max(dragStartRef.current.initialPanY + percentDeltaY, -100),
      100
    );

    onChangePan(Math.round(nextPanX), Math.round(nextPanY));
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Map aspect ratio string to width/aspect utility
  let aspectClass = "aspect-4/5 w-[min(100%,19rem)]";
  if (config.aspectRatio === "1/1")
    aspectClass = "aspect-square w-[min(100%,19rem)]";
  else if (config.aspectRatio === "5/4")
    aspectClass = "aspect-5/4 w-[min(100%,22rem)]";
  else if (config.aspectRatio === "3/4")
    aspectClass = "aspect-3/4 w-[min(100%,18rem)]";

  // Filter style
  let filterStyle = "";
  if (config.filter === "vintage")
    filterStyle = "contrast(1.3) sepia(0.35) grayscale(0.2)";
  else if (config.filter === "sepia")
    filterStyle = "sepia(0.85) contrast(1.15) brightness(0.95)";
  else if (config.filter === "cyanotype")
    filterStyle = "contrast(1.4) hue-rotate(180deg) saturate(1.8)";
  else if (config.filter === "monochrome")
    filterStyle = "grayscale(1) contrast(1.35)";

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Animated Stamp Container */}
      <div
        className={`transition-all duration-300 ease-out ${
          isStamping
            ? "translate-y-3 scale-90 rotate-[-1deg] brightness-95"
            : "translate-y-0 scale-100 rotate-0 hover:scale-[1.01]"
        }`}
      >
        <Stamp
          paper={config.paperColor}
          ink={config.inkColor}
          padding={config.padding}
          horizontalPerforations={config.horizontalPerforations}
          verticalPerforations={config.verticalPerforations}
          perforationDepth={config.perforationDepth}
          className={`${aspectClass} shadow-2xl transition-shadow`}
          contentClassName="rounded-xs overflow-hidden"
        >
          {/* Inner frame containing image and borders */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            className="group relative size-full cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
              touchAction: "none",
            }}
            title="Click and drag to position image"
          >
            {/* The Image Layer */}
            {config.imageUrl ? (
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `translate(${config.panX}%, ${config.panY}%) rotate(${config.rotation}deg) scale(${config.zoom})`,
                  filter: filterStyle || undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.imageUrl}
                  alt="Stamp visual"
                  className="pointer-events-none size-full object-cover select-none"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="flex size-full flex-col items-center justify-center bg-zinc-100 p-6 text-center text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                <p className="text-xs font-semibold">No Image Selected</p>
                <p className="mt-1 text-[10px]">Upload or pick a sample</p>
              </div>
            )}

            {/* Inner vintage decorative border */}
            <div
              className="pointer-events-none absolute inset-0 border-2"
              style={{ borderColor: config.inkColor }}
            />
            <div
              className="pointer-events-none absolute inset-[5px] border border-dashed opacity-75"
              style={{ borderColor: config.inkColor }}
            />

            {/* Country Header Ribbon */}
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

            {/* Denomination Value Badge */}
            {config.denomination.trim() && (
              <div className="pointer-events-none absolute right-2 bottom-2 flex">
                <span
                  className="min-w-[28px] border px-1.5 py-0.5 text-center text-[12px] font-black tracking-tight shadow-xs"
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

            {/* Subtitle / Footer */}
            {config.subtitle?.trim() && (
              <div className="pointer-events-none absolute bottom-2 left-2 flex">
                <span
                  className="px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase opacity-90"
                  style={{
                    color: config.inkColor,
                    fontFamily: "sans-serif",
                  }}
                >
                  {config.subtitle}
                </span>
              </div>
            )}

            {/* Postmark Overlay */}
            {config.enablePostmark && (
              <Postmark
                style={config.postmarkStyle}
                city={config.postmarkCity}
                date={config.postmarkDate}
                inkColor={config.postmarkColor}
                rotation={config.postmarkRotation}
              />
            )}

            {/* Hover overlay hint */}
            <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-medium text-white shadow-xs backdrop-blur-xs">
                <HandGrabbing size={11} /> Drag to pan
              </span>
            </div>
          </div>
        </Stamp>
      </div>

      {/* Subtle Shadow Floor Reflection */}
      <div className="mt-4 h-2 w-32 rounded-full bg-black/10 blur-xs dark:bg-white/10" />
    </div>
  );
}
