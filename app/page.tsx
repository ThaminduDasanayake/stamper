"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { StampConfig } from "@/lib/stamp-renderer";
import {
  renderStampToCanvas,
  downloadStampPng,
  copyStampToClipboard,
} from "@/lib/stamp-renderer";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import { playStampSound } from "@/lib/sound";
import { StampPreview } from "@/components/stamp-preview";
import { StampControls } from "@/components/stamp-controls";
import {
  StampedCollection,
  StampedItem,
} from "@/components/stamped-collection";
import { PrintSheetModal } from "@/components/print-sheet-modal";
import {
  DownloadSimple,
  CopySimple,
  Check,
  SealCheck,
  EnvelopeSimple,
} from "@phosphor-icons/react";

const INITIAL_CONFIG: StampConfig = {
  imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_STAMPS[0].svg)}`,
  panX: 0,
  panY: 0,
  zoom: 1,
  rotation: 0,
  filter: "none",

  aspectRatio: "4/5",
  paperColor: "#fcf8f0",
  inkColor: "#8a2832",
  padding: 13,
  horizontalPerforations: 12,
  verticalPerforations: 15,
  perforationDepth: 2.4,

  country: "HELVETIA",
  denomination: "50c",
  subtitle: "SPECIAL ISSUE",

  enablePostmark: true,
  postmarkStyle: "classic-wavy",
  postmarkCity: "ZÜRICH POST",
  postmarkDate: "18.X.26",
  postmarkColor: "#222222",
  postmarkRotation: -14,
};

export default function Home() {
  const [config, setConfig] = useState<StampConfig>(INITIAL_CONFIG);
  const [isStamping, setIsStamping] = useState(false);
  const [collection, setCollection] = useState<StampedItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stamper_collection");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage errors
    }
    return [];
  });
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Save collection to localStorage
  const saveCollection = useCallback((items: StampedItem[]) => {
    setCollection(items);
    try {
      localStorage.setItem(
        "stamper_collection",
        JSON.stringify(items.slice(0, 30))
      );
    } catch {
      // Ignore quota exceeded
    }
  }, []);

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result as string;
              if (url) {
                setConfig((prev) => ({
                  ...prev,
                  imageUrl: url,
                  panX: 0,
                  panY: 0,
                  zoom: 1,
                  rotation: 0,
                }));
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Drag and drop image file directly onto the window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          setConfig((prev) => ({
            ...prev,
            imageUrl: url,
            panX: 0,
            panY: 0,
            zoom: 1,
            rotation: 0,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfigChange = (patch: Partial<StampConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleResetPanZoom = () => {
    setConfig((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
    }));
  };

  // The "Stamp Out" moment!
  const handleStampOut = async () => {
    if (isStamping) return;

    setIsStamping(true);
    playStampSound();

    try {
      // Render to canvas to generate a preview thumbnail
      const canvas = await renderStampToCanvas(config, 600);
      const previewDataUrl = canvas.toDataURL("image/png");

      const newItem: StampedItem = {
        id: `stamp-${Date.now()}`,
        timestamp: Date.now(),
        previewDataUrl,
        config: { ...config },
      };

      setTimeout(() => {
        setIsStamping(false);
        saveCollection([newItem, ...collection]);
      }, 350);
    } catch {
      setIsStamping(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const safeTitle = (config.country || "postage-stamp")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      await downloadStampPng(config, `${safeTitle}.png`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyStampToClipboard(config);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDeleteItem = (id: string) => {
    saveCollection(collection.filter((item) => item.id !== id));
  };

  const handleSelectFromCollection = (loadedConfig: StampConfig) => {
    setConfig(loadedConfig);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors dark:bg-[#0f0f11] dark:text-zinc-100"
    >
      {/* Top Header */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
              <EnvelopeSimple size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  STAMPER
                </h1>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Design &amp; stamp out authentic perforated postage stamps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
              Tip: Paste any image with{" "}
              <kbd className="rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-800">
                Cmd+V
              </kbd>
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Workbench */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Canvas Preview & Stamp Action (5 cols) */}
          <section className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/60 p-6 shadow-sm backdrop-blur-md lg:col-span-5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
            {/* Live Stamp Component */}
            <StampPreview
              config={config}
              onChangePan={(panX, panY) => handleConfigChange({ panX, panY })}
              isStamping={isStamping}
            />

            {/* The Big "Stamp Out" Punch Action Button */}
            <div className="mt-6 flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={handleStampOut}
                disabled={isStamping}
                className={`relative flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold tracking-wide uppercase shadow-lg transition-all active:scale-98 ${
                  isStamping
                    ? "scale-95 bg-amber-600 text-white shadow-inner"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                }`}
              >
                <SealCheck size={20} weight="fill" />
                {isStamping ? "Stamping..." : "Stamp It!"}
              </button>

              {/* Secondary Download & Copy Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-semibold text-zinc-800 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  title="Download transparent perforated PNG"
                >
                  <DownloadSimple size={16} />
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-semibold text-zinc-800 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  title="Copy PNG to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check size={16} className="text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopySimple size={16} />
                      Copy Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Right Editor Deck (7 cols) */}
          <section className="lg:col-span-7">
            <StampControls
              config={config}
              onChange={handleConfigChange}
              onResetPanZoom={handleResetPanZoom}
            />
          </section>
        </div>

        {/* Bottom Section: Stamped Album */}
        <section className="mt-12">
          <StampedCollection
            items={collection}
            onSelect={handleSelectFromCollection}
            onDelete={handleDeleteItem}
            onOpenPrintSheet={() => setIsPrintModalOpen(true)}
          />
        </section>
      </main>

      {/* Print Sheet Modal */}
      <PrintSheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={collection}
      />
    </div>
  );
}
