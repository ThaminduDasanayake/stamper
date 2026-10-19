"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { StampConfig, CropOptions } from "@/lib/stamp-renderer";
import {
  renderStampToCanvas,
  loadImage,
  computeCropFromCutter,
  createCroppedImage,
  getStampPadding,
} from "@/lib/stamp-renderer";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import { playStampSound } from "@/lib/sound";
import {
  CanvasWorkspace,
  StampCutterState,
} from "@/components/canvas-workspace";
import { StudioSidebar } from "@/components/studio-sidebar";
import {
  StampedCollection,
  StampedItem,
} from "@/components/stamped-collection";
import { PrintSheetModal } from "@/components/print-sheet-modal";
import { PostStampModal } from "@/components/post-stamp-modal";
import { processImageFile } from "@/lib/image-utils";
import { useStampedCollection } from "@/lib/collection-store";
import {
  EnvelopeSimpleIcon,
  PaintBrushIcon,
  ArchiveIcon,
  SealCheckIcon,
  PrinterIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";

const INITIAL_CONFIG: StampConfig = {
  imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_STAMPS[0].svg)}`,
  country: "",
  denomination: "",
  subtitle: "",
  aspectRatio: "4/5",
  paperColor: "#ffffff",
  inkColor: "#181713",
  padding: 13,
  horizontalPerforations: 12,
  verticalPerforations: 15,
  perforationDepth: 2.4,
};

const INITIAL_CUTTER: StampCutterState = {
  x: 240,
  y: 120,
  width: 198,
  rotation: 0,
};

export default function Home() {
  const [currentView, setCurrentView] = useState<"studio" | "collection">(
    "studio"
  );
  const [config, setConfig] = useState<StampConfig>(INITIAL_CONFIG);
  const [cutter, setCutter] = useState<StampCutterState>(INITIAL_CUTTER);
  const [isStamping, setIsStamping] = useState(false);
  const [collection, saveCollection] = useStampedCollection();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [stampedToast, setStampedToast] = useState(false);
  const [activeEditingStamp, setActiveEditingStamp] = useState<StampedItem | null>(null);
  const [isPostStampModalOpen, setIsPostStampModalOpen] = useState(false);

  // Sync with URL query parameter or hash on client mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "collection" || window.location.hash === "#collection") {
      setTimeout(() => setCurrentView("collection"), 0);
    }
  }, []);

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

  const handleConfigChange = (patch: Partial<StampConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleChangeCutter = (patch: Partial<StampCutterState>) => {
    setCutter((prev) => ({ ...prev, ...patch }));
  };

  const handleResetCutter = () => {
    setCutter(INITIAL_CUTTER);
  };

  // Auto resize stamp cutter to dimensions of current image or align to corners
  const handleAutoResizeToImage = useCallback(
    (
      mode:
        | "full"
        | "corner"
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
        | "half" = "full"
    ) => {
      if (!config.imageUrl) return;
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 680;
        const naturalH = img.naturalHeight || 850;
        const imageDisplayWidth = 680;
        const imageDisplayX = 40;
        const imageDisplayY = 40;
        const displayH = Math.round((naturalH / naturalW) * imageDisplayWidth);

        // Standard fixed 4:5 postage stamp ratio (12 x 15 perforations)
        const mult = 5 / 4;
        const maxFitW = Math.min(
          imageDisplayWidth,
          Math.floor(displayH / mult)
        );
        const maxFitH = Math.round(maxFitW * mult);

        if (mode === "full") {
          // Fit largest 4:5 stamp centered within the image
          const centerX = Math.round(
            imageDisplayX + (imageDisplayWidth - maxFitW) / 2
          );
          const centerY = Math.round(
            imageDisplayY + (displayH - maxFitH) / 2
          );
          setCutter({
            x: centerX,
            y: centerY,
            width: maxFitW,
            rotation: 0,
          });
          setConfig((prev) => ({
            ...prev,
            aspectRatio: "4/5",
            horizontalPerforations: 12,
            verticalPerforations: 15,
          }));
        } else if (
          mode === "corner" ||
          mode === "top-left" ||
          mode === "top-right" ||
          mode === "bottom-left" ||
          mode === "bottom-right"
        ) {
          setCutter((prev) => {
            let targetW = prev.width;
            if (targetW >= maxFitW * 0.95) {
              targetW = Math.min(maxFitW, Math.round(imageDisplayWidth * 0.5));
            } else {
              targetW = Math.min(targetW, maxFitW);
            }
            targetW = Math.max(80, targetW);
            const targetH = Math.round(targetW * mult);

            let newX = imageDisplayX;
            let newY = imageDisplayY;

            if (mode === "top-right") {
              newX = imageDisplayX + imageDisplayWidth - targetW;
              newY = imageDisplayY;
            } else if (mode === "bottom-left") {
              newX = imageDisplayX;
              newY = imageDisplayY + displayH - targetH;
            } else if (mode === "bottom-right") {
              newX = imageDisplayX + imageDisplayWidth - targetW;
              newY = imageDisplayY + displayH - targetH;
            }

            return {
              ...prev,
              x: Math.round(newX),
              y: Math.round(newY),
              width: Math.round(targetW),
              rotation: 0,
            };
          });
        } else {
          const halfW = Math.round(maxFitW * 0.6);
          const halfH = Math.round(halfW * mult);
          setCutter({
            x: Math.round(imageDisplayX + (imageDisplayWidth - halfW) / 2),
            y: Math.round(imageDisplayY + (displayH - halfH) / 2),
            width: halfW,
            rotation: 0,
          });
        }
      };
      img.src = config.imageUrl;
    },
    [config.imageUrl]
  );

  // Stamping execution: takes precise stencil crop from canvas
  const handleStampOut = useCallback(
    async (providedCrop?: CropOptions) => {
      if (isStamping) return;

      setIsStamping(true);
      playStampSound();

      let cropToUse = providedCrop;

      // If called from sidebar without explicit crop, calculate from current cutter
      if (!cropToUse && config.imageUrl) {
        try {
          const img = await loadImage(config.imageUrl);
          cropToUse = computeCropFromCutter(
            cutter,
            config,
            img.naturalWidth,
            img.naturalHeight
          );
        } catch (err) {
          console.warn("Could not calculate crop from cutter:", err);
        }
      }

      // Physically cut and extract the cropped image fragment
      let croppedImageUrl = config.imageUrl;
      if (cropToUse) {
        try {
          croppedImageUrl = await createCroppedImage(config.imageUrl, cropToUse);
        } catch (err) {
          console.warn("Could not extract cropped image:", err);
        }
      }

      // The stamp configuration now points to the physical cropped fragment
      const stampConfigForCrop: StampConfig = {
        ...config,
        imageUrl: croppedImageUrl,
        crop: undefined,
        cutterWidth: cropToUse?.cutterWidth || cutter.width,
      };

      let previewDataUrl = croppedImageUrl;
      try {
        const canvas = await renderStampToCanvas(stampConfigForCrop, 600);
        previewDataUrl = canvas.toDataURL("image/png");
      } catch (err) {
        console.warn("Stamp canvas rendering failed:", err);
      }

      const newItem: StampedItem = {
        id: `stamp-${Date.now()}`,
        timestamp: Date.now(),
        previewDataUrl,
        config: stampConfigForCrop,
        crop: cropToUse,
        rawImageUrl: config.imageUrl, // Preserve full original photo for Restamping
      };

      setTimeout(() => {
        setIsStamping(false);
        saveCollection([newItem, ...collection]);
        setStampedToast(true);
        setTimeout(() => setStampedToast(false), 4500);
      }, 350);
    },
    [isStamping, config, cutter, collection, saveCollection]
  );

  const handleSavePostStamp = (updatedItem: StampedItem) => {
    saveCollection(
      collection.map((c) => (c.id === updatedItem.id ? updatedItem : c))
    );
    setActiveEditingStamp(updatedItem);
  };

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file)
              .then((url) => {
                setConfig((prev) => ({ ...prev, imageUrl: url }));
                handleResetCutter();
                switchView("studio");
              })
              .catch(() => {});
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Window drag and drop image file
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImageFile(file)
        .then((url) => {
          setConfig((prev) => ({ ...prev, imageUrl: url }));
          handleResetCutter();
          switchView("studio");
        })
        .catch(() => {});
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

  const handleSelectFromCollection = (
    itemOrConfig: StampedItem | StampConfig
  ) => {
    let selectedConfig: StampConfig;
    let selectedCrop: CropOptions | undefined;

    if ("config" in itemOrConfig) {
      selectedConfig = {
        ...itemOrConfig.config,
        imageUrl: itemOrConfig.rawImageUrl || itemOrConfig.config.imageUrl,
      };
      selectedCrop = itemOrConfig.crop || itemOrConfig.config.crop;
    } else {
      selectedConfig = itemOrConfig;
      selectedCrop = itemOrConfig.crop;
    }

    setConfig(selectedConfig);

    if (selectedCrop) {
      setCutter((prev) => ({
        ...prev,
        x: selectedCrop.cutterX ?? prev.x,
        y: selectedCrop.cutterY ?? prev.y,
        width: selectedCrop.cutterWidth || prev.width,
        rotation: selectedCrop.rotation ?? prev.rotation,
      }));
    }

    switchView("studio");
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased select-none"
    >
      {/* Top Header Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => switchView("studio")}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-85"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-white text-zinc-950 shadow-xs">
              <EnvelopeSimpleIcon size={18} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-black tracking-tight text-white">
                  STAMPER
                </span>
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[8px] font-bold text-zinc-400">
                  STUDIO
                </span>
              </div>
              <p className="hidden text-[10px] text-zinc-400 sm:block">
                Postage Stamp Workbench
              </p>
            </div>
          </button>
        </div>

        {/* View Switcher: Studio (Canvas) vs Collection Album */}
        <div className="flex items-center rounded-lg bg-zinc-800/90 p-1">
          <button
            type="button"
            onClick={() => switchView("studio")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              currentView === "studio"
                ? "bg-zinc-700 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PaintBrushIcon
              size={14}
              weight={currentView === "studio" ? "fill" : "regular"}
            />
            <span>Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => switchView("collection")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              currentView === "collection"
                ? "bg-zinc-700 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ArchiveIcon
              size={14}
              weight={currentView === "collection" ? "fill" : "regular"}
            />
            <span>Album</span>
            {collection.length > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                {collection.length}
              </span>
            )}
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {stampedToast && (
            <div className="animate-in fade-in hidden items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-3 py-1 text-xs font-medium text-emerald-300 shadow-sm md:flex">
              <SealCheckIcon
                size={14}
                weight="fill"
                className="text-emerald-400"
              />
              <span>Stamp added to Album!</span>
              <button
                type="button"
                onClick={() => switchView("collection")}
                className="ml-1 font-bold underline hover:text-white"
              >
                View
              </button>
            </div>
          )}

          {collection.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <PrinterIcon size={15} />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workbench Body with Inset Frame (not edge-to-edge) */}
      {currentView === "studio" ? (
        <div className="flex flex-1 gap-3 overflow-hidden bg-black p-3">
          {/* Framed Center Canvas Workspace Card */}
          <main className="relative flex h-full flex-1 overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0c0c0e] shadow-2xl">
            <CanvasWorkspace
              config={config}
              cutter={cutter}
              onChangeCutter={handleChangeCutter}
              onChangeConfig={handleConfigChange}
              onStampOut={handleStampOut}
              onAutoResizeToImage={handleAutoResizeToImage}
              isStamping={isStamping}
            />
          </main>

          {/* Framed Right-Hand Sidebar Card */}
          <aside className="flex h-full w-90 shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/95 shadow-2xl backdrop-blur-md">
            <StudioSidebar
              config={config}
              cutter={cutter}
              collection={collection}
              onChangeConfig={handleConfigChange}
              onChangeCutter={handleChangeCutter}
              onResetCutter={handleResetCutter}
              onAutoResizeToImage={handleAutoResizeToImage}
              onStampOut={() => handleStampOut()}
              onSelectFromCollection={handleSelectFromCollection}
              onDeleteFromCollection={handleDeleteItem}
              onOpenPrintSheet={() => setIsPrintModalOpen(true)}
              isStamping={isStamping}
            />
          </aside>
        </div>
      ) : (
        /* Full Album View */
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-10">
          <div className="mx-auto max-w-7xl">
            <StampedCollection
              items={collection}
              onSelect={handleSelectFromCollection}
              onDelete={handleDeleteItem}
              onClearAll={handleClearAll}
              onOpenPrintSheet={() => setIsPrintModalOpen(true)}
              onGoToStudio={() => switchView("studio")}
              onEditText={(item) => {
                setActiveEditingStamp(item);
                setIsPostStampModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Print Sheet Modal */}
      <PrintSheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={collection}
      />

      {/* Post-Stamp Text & Typography Customization Modal */}
      <PostStampModal
        isOpen={isPostStampModalOpen}
        item={activeEditingStamp}
        onClose={() => setIsPostStampModalOpen(false)}
        onSave={handleSavePostStamp}
      />
    </div>
  );
}
