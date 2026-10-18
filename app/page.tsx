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
  PaintBrush,
  Archive,
  ArrowRight,
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
  const [currentView, setCurrentView] = useState<"studio" | "collection">(
    () => {
      if (typeof window === "undefined") return "studio";
      try {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "collection" || window.location.hash === "#collection") {
          return "collection";
        }
      } catch {
        // Ignore
      }
      return "studio";
    }
  );
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
  const [stampedToast, setStampedToast] = useState(false);

  // Update URL search param when switching views
  const switchView = (view: "studio" | "collection") => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (view === "collection") {
        url.searchParams.set("tab", "collection");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

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
                // Bring to studio if pasted while in collection
                switchView("studio");
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
          switchView("studio");
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
        setStampedToast(true);
        setTimeout(() => setStampedToast(false), 5000);
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

  const handleClearAll = () => {
    if (
      window.confirm("Are you sure you want to clear your entire collection?")
    ) {
      saveCollection([]);
    }
  };

  const handleSelectFromCollection = (loadedConfig: StampConfig) => {
    setConfig(loadedConfig);
    switchView("studio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors dark:bg-[#0f0f11] dark:text-zinc-100"
    >
      {/* Top Header with Studio vs Collection Switcher */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => switchView("studio")}
              className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-85"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
                <EnvelopeSimple size={20} weight="fill" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                    STAMPER
                  </span>
                  <span className="py-0.2 rounded-full bg-zinc-100 px-1.5 text-[9px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    POST
                  </span>
                </div>
                <p className="hidden text-[10px] text-zinc-400 sm:block dark:text-zinc-500">
                  Philatelic Stamp Studio
                </p>
              </div>
            </button>
          </div>

          {/* Primary View Switcher Tabs */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => switchView("studio")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                currentView === "studio"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <PaintBrush
                size={15}
                weight={currentView === "studio" ? "fill" : "regular"}
              />
              Studio
            </button>
            <button
              type="button"
              onClick={() => switchView("collection")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                currentView === "collection"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Archive
                size={15}
                weight={currentView === "collection" ? "fill" : "regular"}
              />
              Collection
              {collection.length > 0 && (
                <span
                  className={`py-0.2 ml-0.5 rounded-full px-1.5 text-[10px] font-bold ${
                    currentView === "collection"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {collection.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* VIEW 1: STUDIO */}
        {currentView === "studio" && (
          <div>
            {/* Stamped Success Floating Toast Banner */}
            {stampedToast && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <SealCheck
                    size={20}
                    weight="fill"
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <span>
                    Stamped successfully! Your creation has been added to the
                    album.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchView("collection")}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-900 dark:hover:bg-emerald-400"
                >
                  View Collection
                  <ArrowRight size={13} weight="bold" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              {/* Studio Stage / Stamp Preview (5 cols) */}
              <section className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/60 p-6 shadow-sm backdrop-blur-md lg:col-span-5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                <div className="mb-4 flex w-full items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800/80">
                  <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                    Live Stamp Canvas
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400">
                    Aspect {config.aspectRatio}
                  </span>
                </div>

                <StampPreview
                  config={config}
                  onChangePan={(panX, panY) =>
                    handleConfigChange({ panX, panY })
                  }
                  isStamping={isStamping}
                />

                {/* Primary Stamp Action */}
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

                  {/* Secondary Actions */}
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

              {/* Studio Editor Controls (7 cols) */}
              <section className="lg:col-span-7">
                <StampControls
                  config={config}
                  onChange={handleConfigChange}
                  onResetPanZoom={handleResetPanZoom}
                />
              </section>
            </div>
          </div>
        )}

        {/* VIEW 2: COLLECTION ALBUM */}
        {currentView === "collection" && (
          <section>
            <StampedCollection
              items={collection}
              onSelect={handleSelectFromCollection}
              onDelete={handleDeleteItem}
              onClearAll={handleClearAll}
              onOpenPrintSheet={() => setIsPrintModalOpen(true)}
              onGoToStudio={() => switchView("studio")}
            />
          </section>
        )}
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
