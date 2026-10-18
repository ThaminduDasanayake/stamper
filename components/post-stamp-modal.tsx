"use client";

import React, { useState, useEffect, useRef } from "react";
import type { StampTextItem, StampConfig } from "@/lib/stamp-renderer";
import { renderStampToCanvas, downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import type { StampedItem } from "@/components/stamped-collection";
import {
  X,
  Plus,
  Trash,
  DownloadSimple,
  CopySimple,
  Check,
  TextT,
  ArrowsOutCardinal,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Crosshair,
} from "@phosphor-icons/react";

export type PostStampModalProps = {
  isOpen: boolean;
  item: StampedItem | null;
  onClose: () => void;
  onSave: (updatedItem: StampedItem) => void;
};

const COLOR_PRESETS = [
  { name: "White", hex: "#ffffff" },
  { name: "Ink Black", hex: "#18181b" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Postal Gold", hex: "#f59e0b" },
  { name: "Crimson Red", hex: "#ef4444" },
  { name: "Royal Blue", hex: "#3b82f6" },
  { name: "Emerald Green", hex: "#10b981" },
];

const SIZE_PRESETS = [
  { label: "S", size: 14 },
  { label: "M", size: 20 },
  { label: "L", size: 28 },
  { label: "XL", size: 40 },
];

export function PostStampModal({
  isOpen,
  item,
  onClose,
  onSave,
}: PostStampModalProps) {
  const [textItems, setTextItems] = useState<StampTextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cleanBaseUrl, setCleanBaseUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stampContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // When modal opens with item: render clean base stamp (strictly NO text baked in)
  useEffect(() => {
    if (!item) return;

    // Load initial text items if any exist
    const initial = item.config.textItems ? [...item.config.textItems] : [];
    setTextItems(initial);
    setSelectedId(initial.length > 0 ? initial[0].id : null);

    let isCancelled = false;
    const cleanConfig: StampConfig = {
      ...item.config,
      crop: undefined,
      cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
      textItems: [],
      country: "",
      denomination: "",
      subtitle: "",
    };

    renderStampToCanvas(cleanConfig, 800)
      .then((canvas) => {
        if (!isCancelled) {
          setCleanBaseUrl(canvas.toDataURL("image/png"));
        }
      })
      .catch((err) => {
        console.warn("Failed rendering clean base stamp:", err);
        if (!isCancelled) {
          setCleanBaseUrl(item.previewDataUrl);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [item]);

  const activeItem = textItems.find((t) => t.id === selectedId) || null;

  // Add a new text label
  const handleAddText = () => {
    const newId = `txt-${Date.now()}`;
    const defaultCorner =
      textItems.length === 0
        ? "top-left"
        : textItems.length === 1
          ? "top-right"
          : textItems.length === 2
            ? "bottom-left"
            : "bottom-right";

    let x = 8;
    let y = 8;
    let align: "left" | "right" | "center" = "left";

    if (defaultCorner === "top-right") {
      x = 92;
      y = 8;
      align = "right";
    } else if (defaultCorner === "bottom-left") {
      x = 8;
      y = 92;
      align = "left";
    } else if (defaultCorner === "bottom-right") {
      x = 92;
      y = 92;
      align = "right";
    }

    const newItem: StampTextItem = {
      id: newId,
      text: textItems.length === 0 ? "POSTAGE" : "24",
      x,
      y,
      fontSize: textItems.length === 0 ? 16 : 24,
      color: "#ffffff",
      fontFamily: "mono",
      align,
      corner: defaultCorner,
    };

    setTextItems((prev) => [...prev, newItem]);
    setSelectedId(newId);
  };

  const handleUpdateActive = (patch: Partial<StampTextItem>) => {
    if (!selectedId) return;
    setTextItems((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, ...patch } : t))
    );
  };

  const handleDeleteActive = () => {
    if (!selectedId) return;
    setTextItems((prev) => prev.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  };

  // Corner snap helper
  const handleSnapCorner = (
    corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  ) => {
    if (!selectedId) return;
    let x = 8;
    let y = 8;
    let align: "left" | "right" | "center" = "left";

    if (corner === "top-right") {
      x = 92;
      y = 8;
      align = "right";
    } else if (corner === "bottom-left") {
      x = 8;
      y = 92;
      align = "left";
    } else if (corner === "bottom-right") {
      x = 92;
      y = 92;
      align = "right";
    } else if (corner === "center") {
      x = 50;
      y = 50;
      align = "center";
    }

    handleUpdateActive({ corner, x, y, align });
  };

  // Drag text directly on the stamp preview
  const handlePointerDownText = (
    e: React.PointerEvent,
    textItem: StampTextItem
  ) => {
    e.stopPropagation();
    setSelectedId(textItem.id);

    const container = stampContainerRef.current;
    if (!container) return;

    isDraggingRef.current = {
      id: textItem.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: textItem.x,
      origY: textItem.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveText = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const container = stampContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - isDraggingRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - isDraggingRef.current.startY) / rect.height) * 100;

    const newX = Math.max(4, Math.min(96, isDraggingRef.current.origX + dx));
    const newY = Math.max(4, Math.min(96, isDraggingRef.current.origY + dy));

    const align: "left" | "right" | "center" =
      newX > 65 ? "right" : newX > 35 ? "center" : "left";

    setTextItems((prev) =>
      prev.map((t) =>
        t.id === isDraggingRef.current?.id
          ? {
              ...t,
              x: Math.round(newX * 10) / 10,
              y: Math.round(newY * 10) / 10,
              corner: "custom",
              align,
            }
          : t
      )
    );
  };

  const handlePointerUpText = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Generate the final combined high-res canvas (Clean Base + Text Items)
  const generateFinalCanvas = async (targetWidth = 1200) => {
    if (!item) return null;
    const finalConfig: StampConfig = {
      ...item.config,
      crop: undefined,
      cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
      textItems,
      country: "",
      denomination: "",
      subtitle: "",
    };
    return await renderStampToCanvas(finalConfig, targetWidth);
  };

  // Save changes to collection item
  const handleSaveAndClose = async () => {
    if (!item) return;
    setIsSaving(true);

    try {
      const canvas = await generateFinalCanvas(1200);
      const newPreview = canvas
        ? canvas.toDataURL("image/png")
        : item.previewDataUrl;

      onSave({
        ...item,
        previewDataUrl: newPreview,
        config: {
          ...item.config,
          crop: undefined,
          cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
          textItems,
          country: "",
          denomination: "",
          subtitle: "",
        },
      });
    } catch (err) {
      console.warn("Could not bake final canvas:", err);
      onSave({
        ...item,
        config: {
          ...item.config,
          crop: undefined,
          cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
          textItems,
        },
      });
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  // Direct download high-res PNG
  const handleDownload = async () => {
    if (!item) return;
    const finalConfig: StampConfig = {
      ...item.config,
      crop: undefined,
      cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
      textItems,
      country: "",
      denomination: "",
      subtitle: "",
    };
    const safeTitle = (activeItem?.text || "stamp")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    await downloadStampPng(finalConfig, `${safeTitle}-${Date.now()}.png`);
  };

  // Direct clipboard copy
  const handleCopy = async () => {
    if (!item) return;
    const finalConfig: StampConfig = {
      ...item.config,
      crop: undefined,
      cutterWidth: item.config.cutterWidth || item.crop?.cutterWidth,
      textItems,
      country: "",
      denomination: "",
      subtitle: "",
    };
    const success = await copyStampToClipboard(finalConfig);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl md:flex-row">
        {/* Left Side: Interactive Stamp Canvas Display */}
        <div className="relative flex min-h-[380px] flex-1 items-center justify-center overflow-hidden bg-black/60 p-6 sm:p-10">
          <div
            ref={stampContainerRef}
            className="relative flex aspect-4/5 max-h-[60vh] w-full max-w-[340px] items-center justify-center select-none"
          >
            {/* Clean Base Stamped Image (Strictly NO text baked in) */}
            {cleanBaseUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cleanBaseUrl}
                alt="Stamped Clean Artwork"
                className="pointer-events-none max-h-full max-w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.7)]"
                draggable={false}
              />
            ) : (
              <div className="size-full animate-pulse rounded-2xl bg-zinc-900" />
            )}

            {/* Single Interactive Text Layer Overlay (Directly over stamp photo) */}
            <div
              className="absolute inset-[6.5%] touch-none overflow-hidden"
              onPointerMove={handlePointerMoveText}
              onPointerUp={handlePointerUpText}
              onPointerCancel={handlePointerUpText}
            >
              {textItems.map((t) => {
                const isSelected = t.id === selectedId;
                const fontClass =
                  t.fontFamily === "serif"
                    ? "font-serif"
                    : t.fontFamily === "sans"
                      ? "font-sans"
                      : "font-mono";

                return (
                  <div
                    key={t.id}
                    onPointerDown={(e) => handlePointerDownText(e, t)}
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
                      fontSize: `${t.fontSize}px`,
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded-sm font-bold leading-none select-none transition-shadow ${fontClass} ${
                      isSelected
                        ? "ring-2 ring-blue-500 shadow-md ring-offset-1 ring-offset-black/50"
                        : "hover:ring-1 hover:ring-white/40"
                    }`}
                    title="Drag to reposition text anywhere on the stamp"
                  >
                    {t.text || "TEXT"}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 flex items-center gap-1.5 pointer-events-none">
            <ArrowsOutCardinal size={12} />
            <span>Click & drag text to position anywhere on the stamp</span>
          </div>
        </div>

        {/* Right Side: Text Customization Controls */}
        <div className="flex w-full flex-col border-t border-zinc-800/80 bg-zinc-900/90 p-5 md:w-96 md:border-t-0 md:border-l">
          {/* Header Bar with integrated Close Button (No overlap!) */}
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Stamp Typography
              </h2>
              <p className="text-xs text-zinc-400">
                Add text, numbers, or tags anywhere on your stamp
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
              title="Close"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          {/* Add Text Action & Layers Row */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              Text Layers ({textItems.length})
            </span>
            <button
              type="button"
              onClick={handleAddText}
              className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-zinc-950 shadow-xs transition-colors hover:bg-zinc-200 active:scale-95"
            >
              <Plus size={13} weight="bold" />
              <span>Add Layer</span>
            </button>
          </div>

          {/* List of text layers pills */}
          {textItems.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5 border-b border-zinc-800/80 pb-3">
              {textItems.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    t.id === selectedId
                      ? "bg-zinc-100 font-bold text-zinc-950 shadow-xs"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t.text.trim() ? t.text.slice(0, 10) : `Text ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Active Text Inspector */}
          {activeItem ? (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {/* Text Input & Delete */}
              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Text Content
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={activeItem.text}
                    onChange={(e) =>
                      handleUpdateActive({ text: e.target.value })
                    }
                    placeholder="e.g. PARKS, 24, AIR MAIL"
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteActive}
                    className="flex size-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800/80 text-zinc-400 transition-colors hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-400"
                    title="Delete text layer"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              {/* Corner Placement Quick-Snaps */}
              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Snap to Corner or Center
                </label>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSnapCorner("top-left")}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors ${
                      activeItem.corner === "top-left"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400"
                    }`}
                    title="Top Left"
                  >
                    <ArrowUpLeft size={16} weight="bold" />
                    <span className="mt-1 text-[9px]">Top L</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSnapCorner("top-right")}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors ${
                      activeItem.corner === "top-right"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400"
                    }`}
                    title="Top Right"
                  >
                    <ArrowUpRight size={16} weight="bold" />
                    <span className="mt-1 text-[9px]">Top R</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSnapCorner("center")}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors ${
                      activeItem.corner === "center"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400"
                    }`}
                    title="Center"
                  >
                    <Crosshair size={16} weight="bold" />
                    <span className="mt-1 text-[9px]">Center</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSnapCorner("bottom-left")}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors ${
                      activeItem.corner === "bottom-left"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400"
                    }`}
                    title="Bottom Left"
                  >
                    <ArrowDownLeft size={16} weight="bold" />
                    <span className="mt-1 text-[9px]">Btm L</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSnapCorner("bottom-right")}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors ${
                      activeItem.corner === "bottom-right"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-400"
                    }`}
                    title="Bottom Right"
                  >
                    <ArrowDownRight size={16} weight="bold" />
                    <span className="mt-1 text-[9px]">Btm R</span>
                  </button>
                </div>
              </div>

              {/* Color Selection: Presets + Custom Color Picker */}
              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Text Color
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleUpdateActive({ color: c.hex })}
                        className={`size-7 rounded-full border transition-all ${
                          activeItem.color.toLowerCase() ===
                          c.hex.toLowerCase()
                            ? "scale-110 ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950 border-white"
                            : "border-white/20 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Native Custom Color Picker */}
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      value={activeItem.color}
                      onChange={(e) =>
                        handleUpdateActive({ color: e.target.value })
                      }
                      className="size-7 cursor-pointer rounded-full border border-zinc-700 bg-transparent p-0 outline-none"
                      title="Choose custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Size Slider & Quick Presets */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                    Font Size
                  </label>
                  <span className="font-mono text-xs font-bold text-zinc-300">
                    {activeItem.fontSize}px
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="64"
                    value={activeItem.fontSize}
                    onChange={(e) =>
                      handleUpdateActive({
                        fontSize: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-white"
                  />
                  <div className="flex items-center gap-1">
                    {SIZE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          handleUpdateActive({ fontSize: p.size })
                        }
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          activeItem.fontSize === p.size
                            ? "bg-white text-zinc-950"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Typeface Font Style */}
              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Typeface
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateActive({ fontFamily: "mono" })}
                    className={`rounded-lg border py-1.5 font-mono text-xs font-bold transition-colors ${
                      activeItem.fontFamily === "mono"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Mono
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateActive({ fontFamily: "sans" })}
                    className={`rounded-lg border py-1.5 font-sans text-xs font-bold transition-colors ${
                      activeItem.fontFamily === "sans"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Sans
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateActive({ fontFamily: "serif" })
                    }
                    className={`rounded-lg border py-1.5 font-serif text-xs font-bold transition-colors ${
                      activeItem.fontFamily === "serif"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Serif
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
                <TextT size={24} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">
                No Text Added Yet
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Add text in any corner, size, or color, or keep the stamp clean and minimal.
              </p>
              <button
                type="button"
                onClick={handleAddText}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 active:scale-95"
              >
                <Plus size={14} weight="bold" />
                <span>Add Text Layer</span>
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-4 border-t border-zinc-800/80 pt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 active:scale-98 disabled:opacity-50"
            >
              <Check size={16} weight="bold" />
              <span>{isSaving ? "Saving..." : "Save & Done"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
              title="Copy stamp image"
            >
              {isCopied ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <CopySimple size={16} />
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
              title="Download high-resolution stamp"
            >
              <DownloadSimple size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
