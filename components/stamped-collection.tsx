"use client";

import React, { useState, useEffect } from "react";
import { Stamp } from "@/components/stamp";
import type { StampConfig, CropOptions } from "@/lib/stamp-renderer";
import { downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import {
  DownloadSimple,
  CopySimple,
  Trash,
  Check,
  ArrowUUpLeft,
  PaintBrush,
  Archive,
  X,
  TextT,
} from "@phosphor-icons/react";

export type StampedItem = {
  id: string;
  timestamp: number;
  previewDataUrl: string;
  config: StampConfig;
  crop?: CropOptions;
  rawImageUrl?: string;
};

export type StampedCollectionProps = {
  items: StampedItem[];
  onSelect: (config: StampConfig) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenPrintSheet: () => void;
  onGoToStudio: () => void;
  onEditText?: (item: StampedItem) => void;
};

export function StampedCollection({
  items,
  onSelect,
  onDelete,
  onClearAll,
  onGoToStudio,
  onEditText,
}: StampedCollectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<StampedItem | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingItem(null);
      }
    };
    if (viewingItem) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewingItem]);

  const handleCopy = async (item: StampedItem) => {
    if (item.previewDataUrl) {
      try {
        const res = await fetch(item.previewDataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || "image/png"]: blob }),
        ]);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
        return;
      } catch (err) {
        console.warn("Direct blob clipboard copy failed, falling back:", err);
      }
    }
    const success = await copyStampToClipboard(item.config);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (item: StampedItem) => {
    const safeTitle = (item.config.country || "stamp")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    if (item.previewDataUrl) {
      const link = document.createElement("a");
      link.download = `${safeTitle}-${item.timestamp}.png`;
      link.href = item.previewDataUrl;
      link.click();
      return;
    }
    downloadStampPng(item.config, `${safeTitle}-${item.timestamp}.png`);
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center backdrop-blur-xs">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-500">
          <Archive size={30} weight="light" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-200">
          Your Stamp Gallery is Empty
        </h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
          Stamp out your first postage creation in the Canvas Studio. It will appear right here in your gallery.
        </p>
        <button
          type="button"
          onClick={onGoToStudio}
          className="mt-6 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 active:scale-95"
        >
          <PaintBrush size={15} weight="bold" />
          <span>Open Canvas Studio</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subtle Gallery Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Gallery
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            {items.length} {items.length === 1 ? "stamp" : "stamps"}
          </span>
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-rose-400"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Pure Stamp Gallery Grid */}
      <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 sm:gap-7">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col items-center justify-center p-2"
          >
            {/* Pure Stamp with Perforated Border */}
            <button
              type="button"
              onClick={() => setViewingItem(item)}
              className="relative flex cursor-pointer items-center justify-center focus:outline-hidden"
              title="Click to view stamp"
            >
              <Stamp
                aria-label={item.config.country || "Postage stamp"}
                padding={13}
                horizontalPerforations={item.config.horizontalPerforations || 12}
                verticalPerforations={item.config.verticalPerforations || 15}
                perforationDepth={item.config.perforationDepth || 2.4}
                paper={item.config.paperColor || "#ffffff"}
                className="z-[1] w-[150px] sm:w-[170px] aspect-[4/5] -rotate-1 transform-gpu transition-transform duration-200 ease-out hover:rotate-0 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:-rotate-1 motion-reduce:hover:scale-100"
                contentClassName="rounded-xs overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.config.imageUrl || item.previewDataUrl}
                  alt={item.config.country || "Stamp"}
                  className="size-full object-cover select-none"
                  draggable={false}
                />

                {/* Render custom text items if added by user via Add Text */}
                {item.config.textItems && item.config.textItems.length > 0 && (
                  <div className="pointer-events-none absolute inset-[8.5%] overflow-hidden">
                    {item.config.textItems.map((t) => {
                      const fontClass =
                        t.fontFamily === "serif"
                          ? "font-serif"
                          : t.fontFamily === "sans"
                            ? "font-sans"
                            : "font-mono";
                      const displayFontSize = Math.max(
                        6,
                        Math.round(t.fontSize * (150 / 380))
                      );
                      return (
                        <span
                          key={t.id}
                          style={{
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            transform: `translate(${
                              t.align === "right"
                                ? "-100%"
                                : t.align === "center"
                                  ? "-50%"
                                  : "0%"
                            }, ${t.y > 65 ? "-100%" : t.y > 35 ? "-50%" : "0%"})`,
                            color: t.color,
                            fontSize: `${displayFontSize}px`,
                          }}
                          className={`absolute font-bold leading-none select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ${fontClass}`}
                        >
                          {t.text}
                        </span>
                      );
                    })}
                  </div>
                )}

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(24_23_19_/_18%)]"
                />
              </Stamp>
            </button>

            {/* Floating Action Pill on Hover */}
            <div className="pointer-events-none absolute -bottom-2 z-20 flex items-center gap-0.5 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-1.5 py-0.5 shadow-2xl backdrop-blur-md opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:-translate-y-0.5">
              {/* Add / Edit Text */}
              {onEditText && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditText(item);
                  }}
                  className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                  title="Add / Edit Text"
                >
                  <TextT size={12} weight="bold" />
                </button>
              )}

              {/* Restamp in Studio */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item.config);
                }}
                className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Restamp in Canvas"
              >
                <ArrowUUpLeft size={12} weight="bold" />
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(item);
                }}
                className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Copy to clipboard"
              >
                {copiedId === item.id ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <CopySimple size={12} />
                )}
              </button>

              {/* Download */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(item);
                }}
                className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Download PNG"
              >
                <DownloadSimple size={12} />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-rose-950/40 hover:text-rose-400"
                title="Delete stamp"
              >
                <Trash size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Large Stamp Lightbox Modal */}
      {viewingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setViewingItem(null)}
              className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={16} weight="bold" />
            </button>

            {/* Stamp Display (Big) */}
            <div className="flex max-h-[58vh] w-full items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingItem.previewDataUrl}
                alt={viewingItem.config.country || "Stamp"}
                className="max-h-[52vh] max-w-full object-contain drop-shadow-[0_24px_45px_rgba(0,0,0,0.7)]"
              />
            </div>

            {/* Actions Bar */}
            <div className="mt-2 flex w-full items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
              <div className="flex items-center gap-2">
                {onEditText && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditText(viewingItem);
                      setViewingItem(null);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20 hover:text-white active:scale-98"
                  >
                    <TextT size={14} weight="bold" />
                    <span>Add Text</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onSelect(viewingItem.config);
                    setViewingItem(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white active:scale-98"
                  title="Reload into Canvas Studio"
                >
                  <ArrowUUpLeft size={14} weight="bold" />
                  <span>Restamp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(viewingItem)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white active:scale-98"
                >
                  {copiedId === viewingItem.id ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <CopySimple size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(viewingItem)}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-zinc-200 active:scale-98"
                >
                  <DownloadSimple size={14} weight="bold" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDelete(viewingItem.id);
                    setViewingItem(null);
                  }}
                  className="flex size-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 transition-colors hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-400"
                  title="Delete stamp"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
