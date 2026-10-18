"use client";

import React, { useRef, useState } from "react";
import type {
  StampConfig,
  StampFilter,
  PostmarkStyle,
} from "@/lib/stamp-renderer";
import type { StampedItem } from "@/components/stamped-collection";
import type { StampCutterState } from "@/components/canvas-workspace";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import { processImageFile } from "@/lib/image-utils";
import { downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import {
  UploadSimple,
  Palette,
  EnvelopeSimple,
  SealCheck,
  Archive,
  ArrowsClockwise,
  DownloadSimple,
  CopySimple,
  Check,
  Trash,
  Printer,
  SlidersHorizontal,
} from "@phosphor-icons/react";

export type StudioSidebarProps = {
  config: StampConfig;
  cutter: StampCutterState;
  collection: StampedItem[];
  onChangeConfig: (patch: Partial<StampConfig>) => void;
  onChangeCutter: (patch: Partial<StampCutterState>) => void;
  onResetCutter: () => void;
  onStampOut: () => void;
  onSelectFromCollection: (item: StampedItem) => void;
  onDeleteFromCollection: (id: string) => void;
  onOpenPrintSheet: () => void;
  isStamping?: boolean;
};

const PAPER_PRESETS = [
  { name: "Parchment", hex: "#f4ecd8" },
  { name: "White", hex: "#ffffff" },
  { name: "Warm Cream", hex: "#fcf8f0" },
  { name: "Manila Buff", hex: "#ebdcc4" },
  { name: "Mint Sage", hex: "#e2ece4" },
  { name: "Dusty Rose", hex: "#f7e8e8" },
  { name: "Dark Archive", hex: "#262523" },
];

const INK_PRESETS = [
  { name: "Postal Charcoal", hex: "#181713" },
  { name: "Sepia Bronze", hex: "#4a3525" },
  { name: "Carmine Red", hex: "#9e2a2b" },
  { name: "Royal Navy", hex: "#1d3557" },
  { name: "Evergreen", hex: "#284b39" },
  { name: "Plum Wine", hex: "#582f4e" },
];

const POSTMARK_COLORS = [
  { name: "Faded Ink", hex: "#222222" },
  { name: "Postal Red", hex: "#a62626" },
  { name: "Indigo Blue", hex: "#243e63" },
];

const FILTERS: { id: StampFilter; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "vintage", label: "Vintage" },
  { id: "sepia", label: "Sepia" },
  { id: "cyanotype", label: "Cyanotype" },
  { id: "monochrome", label: "B&W Engraved" },
];

export function StudioSidebar({
  config,
  cutter,
  collection,
  onChangeConfig,
  onChangeCutter,
  onResetCutter,
  onStampOut,
  onSelectFromCollection,
  onDeleteFromCollection,
  onOpenPrintSheet,
  isStamping = false,
}: StudioSidebarProps) {
  const [activeTab, setActiveTab] = useState<
    "cutter" | "paper" | "postal" | "album"
  >("cutter");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedUrl = await processImageFile(file);
      onChangeConfig({ imageUrl: optimizedUrl });
      onResetCutter();
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          onChangeConfig({ imageUrl: url });
          onResetCutter();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePickSample = (sampleId: string) => {
    const sample = SAMPLE_STAMPS.find((s) => s.id === sampleId);
    if (!sample) return;

    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(sample.svg)}`;
    onChangeConfig({
      imageUrl: svgDataUri,
      country: sample.suggestedCountry,
      denomination: sample.suggestedDenomination,
      paperColor: sample.suggestedPaper,
      inkColor: sample.suggestedInk,
    });
    onResetCutter();
  };

  const handleCopyItem = async (item: StampedItem) => {
    const success = await copyStampToClipboard(item.config);
    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownloadItem = (item: StampedItem) => {
    const safeTitle = (item.config.country || "stamp")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    downloadStampPng(item.config, `${safeTitle}-${item.timestamp}.png`);
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-200/80 bg-white/90 shadow-xl backdrop-blur-xl sm:w-96 dark:border-zinc-800/80 dark:bg-zinc-900/90">
      {/* Top Sidebar Header Tabs */}
      <div className="border-b border-zinc-200/80 p-3.5 dark:border-zinc-800/80">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("cutter")}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
              activeTab === "cutter"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <SlidersHorizontal size={15} />
            Cutter
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("paper")}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
              activeTab === "paper"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Palette size={15} />
            Paper
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("postal")}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
              activeTab === "postal"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <EnvelopeSimple size={15} />
            Markings
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("album")}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
              activeTab === "album"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Archive size={15} />
            Album
            {collection.length > 0 && (
              <span className="absolute top-1 right-2 flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-black text-white dark:bg-zinc-100 dark:text-zinc-900">
                {collection.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Tool Panel Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* TAB 1: CUTTER & IMAGE */}
        {activeTab === "cutter" && (
          <div className="space-y-5">
            {/* Upload Image Section */}
            <div>
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Change Canvas Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <UploadSimple size={16} className="text-zinc-500" />
                Upload New Photo
              </button>
            </div>

            {/* Built-in Preset Artworks */}
            <div>
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Or Use Built-in Artworks
              </label>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {SAMPLE_STAMPS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handlePickSample(sample.id)}
                    className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 transition-all hover:border-zinc-400 hover:shadow-xs dark:border-zinc-700 dark:bg-zinc-800"
                    title={sample.name}
                  >
                    <div
                      className="size-9 overflow-hidden rounded-xs"
                      dangerouslySetInnerHTML={{ __html: sample.svg }}
                    />
                    <span className="mt-0.5 w-full truncate text-[8px] font-medium text-zinc-500 dark:text-zinc-400">
                      {sample.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stamp Cutter Width / Size */}
            <div className="dark:bg-zinc-850 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">
                  Stamp Cutter Size
                </span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  {cutter.width}px
                </span>
              </div>
              <input
                type="range"
                min="130"
                max="340"
                step="5"
                value={cutter.width}
                onChange={(e) =>
                  onChangeCutter({ width: parseInt(e.target.value, 10) })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
              <p className="mt-1 text-[10px] text-zinc-400">
                Adjust the size of the stamp puncher on the canvas
              </p>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Stamp Proportion
              </label>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "4/5", label: "4:5" },
                    { id: "1/1", label: "1:1" },
                    { id: "5/4", label: "5:4" },
                    { id: "3/4", label: "3:4" },
                  ] as const
                ).map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => onChangeConfig({ aspectRatio: ar.id })}
                    className={`rounded-lg py-2 text-center text-xs font-bold transition-all ${
                      config.aspectRatio === ar.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cutter Rotation & Reset Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                    Cutter Angle
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {cutter.rotation}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={cutter.rotation}
                  onChange={(e) =>
                    onChangeCutter({ rotation: parseInt(e.target.value, 10) })
                  }
                  className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={onResetCutter}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <ArrowsClockwise size={14} />
                  Reset Cutter
                </button>
              </div>
            </div>

            {/* Filters */}
            <div>
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Visual Postal Filter
              </label>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChangeConfig({ filter: f.id })}
                    className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                      config.filter === f.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAPER, INK & PERFORATIONS */}
        {activeTab === "paper" && (
          <div className="space-y-5">
            {/* Paper Color */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Paper Color
                </label>
                <input
                  type="color"
                  value={config.paperColor}
                  onChange={(e) =>
                    onChangeConfig({ paperColor: e.target.value })
                  }
                  className="size-5 cursor-pointer rounded-xs border-0 bg-transparent"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PAPER_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => onChangeConfig({ paperColor: preset.hex })}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      config.paperColor.toLowerCase() ===
                      preset.hex.toLowerCase()
                        ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    <span
                      className="size-2.5 rounded-full border border-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ink Color */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Ink Color
                </label>
                <input
                  type="color"
                  value={config.inkColor}
                  onChange={(e) => onChangeConfig({ inkColor: e.target.value })}
                  className="size-5 cursor-pointer rounded-xs border-0 bg-transparent"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INK_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => onChangeConfig({ inkColor: preset.hex })}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      config.inkColor.toLowerCase() === preset.hex.toLowerCase()
                        ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Perforation Depth & Margin */}
            <div className="dark:bg-zinc-850 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">
                    Perforation Cut Depth
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {config.perforationDepth}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.5"
                  step="0.2"
                  value={config.perforationDepth}
                  onChange={(e) =>
                    onChangeConfig({
                      perforationDepth: parseFloat(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-300">
                    Inner Margin Padding
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {config.padding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="1"
                  value={config.padding}
                  onChange={(e) =>
                    onChangeConfig({ padding: parseInt(e.target.value, 10) })
                  }
                  className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
            </div>

            {/* Perforation Counts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                    H-Perfs
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {config.horizontalPerforations}
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="1"
                  value={config.horizontalPerforations}
                  onChange={(e) =>
                    onChangeConfig({
                      horizontalPerforations: parseInt(e.target.value, 10),
                    })
                  }
                  className="mt-1 w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                    V-Perfs
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {config.verticalPerforations}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="32"
                  step="1"
                  value={config.verticalPerforations}
                  onChange={(e) =>
                    onChangeConfig({
                      verticalPerforations: parseInt(e.target.value, 10),
                    })
                  }
                  className="mt-1 w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POSTMARK & MARKINGS */}
        {activeTab === "postal" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Country Text
                </label>
                <input
                  type="text"
                  value={config.country}
                  onChange={(e) => onChangeConfig({ country: e.target.value })}
                  placeholder="e.g. POSTAGE"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Denomination
                </label>
                <input
                  type="text"
                  value={config.denomination}
                  onChange={(e) =>
                    onChangeConfig({ denomination: e.target.value })
                  }
                  placeholder="e.g. 50¢"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Subtitle / Footer
              </label>
              <input
                type="text"
                value={config.subtitle || ""}
                onChange={(e) => onChangeConfig({ subtitle: e.target.value })}
                placeholder="e.g. SPECIAL DELIVERY"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Postmark Toggle */}
            <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Cancellation Postmark
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    Vintage ink postmark stamped over image
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({ enablePostmark: !config.enablePostmark })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.enablePostmark
                      ? "bg-zinc-900 dark:bg-zinc-100"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      config.enablePostmark
                        ? "translate-x-6 dark:bg-zinc-900"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {config.enablePostmark && (
                <div className="dark:bg-zinc-850 mt-3.5 space-y-3.5 rounded-xl bg-zinc-50/80 p-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "classic-wavy", label: "Classic Wavy" },
                      { id: "double-circle", label: "Double Circle" },
                      { id: "airmail-triangle", label: "Airmail Triangle" },
                      { id: "bars-only", label: "Killer Bars" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          onChangeConfig({
                            postmarkStyle: st.id as PostmarkStyle,
                          })
                        }
                        className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                          config.postmarkStyle === st.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">
                        City
                      </label>
                      <input
                        type="text"
                        value={config.postmarkCity}
                        onChange={(e) =>
                          onChangeConfig({ postmarkCity: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">
                        Date
                      </label>
                      <input
                        type="text"
                        value={config.postmarkDate}
                        onChange={(e) =>
                          onChangeConfig({ postmarkDate: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      Ink
                    </span>
                    <div className="flex gap-1.5">
                      {POSTMARK_COLORS.map((pc) => (
                        <button
                          key={pc.hex}
                          type="button"
                          onClick={() =>
                            onChangeConfig({ postmarkColor: pc.hex })
                          }
                          className={`size-5 rounded-full border transition-transform ${
                            config.postmarkColor.toLowerCase() ===
                            pc.hex.toLowerCase()
                              ? "scale-110 ring-2 ring-zinc-900 dark:ring-zinc-100"
                              : "border-black/20"
                          }`}
                          style={{ backgroundColor: pc.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALBUM / COLLECTION */}
        {activeTab === "album" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Stamped Archive ({collection.length})
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Your stamped creations from this canvas
                </p>
              </div>

              {collection.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenPrintSheet}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <Printer size={13} />
                  Print
                </button>
              )}
            </div>

            {collection.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No stamps cut out yet
                </p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Move the stamp cutter over the image and hit &ldquo;Stamp
                  Out&rdquo;!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {collection.map((item) => (
                  <div
                    key={item.id}
                    className="group dark:bg-zinc-850 relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xs transition-all hover:border-zinc-400 dark:border-zinc-800"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectFromCollection(item)}
                      className="flex aspect-4/5 w-full cursor-pointer items-center justify-center p-1 transition-transform group-hover:scale-105"
                      title="Load into cutter"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewDataUrl}
                        alt="Stamped item"
                        className="max-h-full max-w-full object-contain drop-shadow-xs"
                      />
                    </button>

                    <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
                      <span className="truncate text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                        {item.config.country || "STAMP"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadItem(item)}
                          className="rounded-md p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Download PNG"
                        >
                          <DownloadSimple size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyItem(item)}
                          className="rounded-md p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Copy image"
                        >
                          {copiedId === item.id ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <CopySimple size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFromCollection(item.id)}
                          className="rounded-md p-1 text-zinc-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Docked Bottom "STAMP IT OUT!" Action Button */}
      <div className="border-t border-zinc-200/80 bg-white/95 p-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <button
          type="button"
          onClick={onStampOut}
          disabled={isStamping}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold tracking-wider uppercase shadow-xl transition-all active:scale-98 ${
            isStamping
              ? "scale-95 bg-amber-600 text-white"
              : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          }`}
        >
          <SealCheck size={19} weight="fill" />
          <span>{isStamping ? "Stamping Cutout..." : "Stamp Cutout"}</span>
        </button>
      </div>
    </aside>
  );
}
