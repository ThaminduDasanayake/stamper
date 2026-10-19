"use client";

import React, { useRef } from "react";
import type { StampConfig } from "@/lib/stamp-renderer";
import type { StampedItem } from "@/components/stamped-collection";
import type { StampCutterState } from "@/components/canvas-workspace";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import { processImageFile } from "@/lib/image-utils";
import {
  UploadSimple,
  SealCheck,
  Sparkle,
  ArrowsOutSimple,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
} from "@phosphor-icons/react";

export type StudioSidebarProps = {
  config: StampConfig;
  cutter: StampCutterState;
  collection?: StampedItem[];
  onChangeConfig: (patch: Partial<StampConfig>) => void;
  onChangeCutter: (patch: Partial<StampCutterState>) => void;
  onResetCutter: () => void;
  onStampOut: () => void;
  onSelectFromCollection?: (item: StampedItem) => void;
  onDeleteFromCollection?: (id: string) => void;
  onOpenPrintSheet?: () => void;
  onAutoResizeToImage?: (
    mode?:
      | "full"
      | "corner"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"
      | "half"
  ) => void;
  isStamping?: boolean;
};

export function StudioSidebar({
  config,
  onChangeConfig,
  onResetCutter,
  onStampOut,
  onAutoResizeToImage,
  isStamping = false,
}: StudioSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedUrl = await processImageFile(file);
      onChangeConfig({
        imageUrl: optimizedUrl,
        country: "",
        denomination: "",
        subtitle: "",
        textItems: [],
      });
      onResetCutter();
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          onChangeConfig({
            imageUrl: url,
            country: "",
            denomination: "",
            subtitle: "",
            textItems: [],
          });
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
      country: "",
      denomination: "",
      subtitle: "",
      textItems: [],
    });
    onResetCutter();
  };

  return (
    <aside className="flex h-full w-full flex-col bg-zinc-900/95 text-zinc-100 select-none">
      {/* Header */}
      <div className="border-b border-zinc-800/80 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">
              Stamp Workbench
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Hover over the photo & click to stamp
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            <Sparkle size={11} weight="fill" />
            Instant
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Big Action: Stamp Button */}
        <div>
          <button
            type="button"
            onClick={onStampOut}
            disabled={isStamping}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-zinc-950 shadow-lg transition-all hover:bg-zinc-200 active:scale-98 disabled:opacity-50"
          >
            <SealCheck size={18} weight="fill" />
            <span>{isStamping ? "Stamping..." : "Stamp This Area"}</span>
          </button>
          <p className="mt-1.5 text-center text-[10px] text-zinc-500">
            Click anywhere on the photo to stamp instantly
          </p>
        </div>

        {/* Change Photo Section */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5">
          <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Source Photo
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
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          >
            <UploadSimple size={15} className="text-zinc-400" />
            Upload New Photo
          </button>

          {/* Sample Photos */}
          <div className="mt-3">
            <span className="text-[10px] font-medium text-zinc-500">
              Or pick an artwork:
            </span>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {SAMPLE_STAMPS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handlePickSample(sample.id)}
                  className="group relative flex flex-col items-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 p-1 transition-all hover:scale-105 hover:border-zinc-600"
                  title={sample.name}
                >
                  <div
                    className="size-8 overflow-hidden rounded-xs"
                    dangerouslySetInnerHTML={{ __html: sample.svg }}
                  />
                  <span className="mt-0.5 w-full truncate text-center text-[8px] text-zinc-400">
                    {sample.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stamp Sizing & Alignment */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5">
          <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Fit & Alignment
          </label>
          <button
            type="button"
            onClick={() => onAutoResizeToImage?.("full")}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 active:scale-98"
            title="Auto-resize to fit entire image"
          >
            <ArrowsOutSimple size={13} weight="bold" />
            <span>Fit to Image</span>
          </button>

          <div className="mt-2.5">
            <span className="text-[10px] font-medium text-zinc-500">
              Snap to Corner:
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onAutoResizeToImage?.("top-left")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 active:scale-98"
                title="Snap stamp directly to the top-left corner"
              >
                <ArrowUpLeft size={13} weight="bold" />
                <span>Top-Left</span>
              </button>
              <button
                type="button"
                onClick={() => onAutoResizeToImage?.("top-right")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 active:scale-98"
                title="Snap stamp directly to the top-right corner"
              >
                <ArrowUpRight size={13} weight="bold" />
                <span>Top-Right</span>
              </button>
              <button
                type="button"
                onClick={() => onAutoResizeToImage?.("bottom-left")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 active:scale-98"
                title="Snap stamp directly to the bottom-left corner"
              >
                <ArrowDownLeft size={13} weight="bold" />
                <span>Bottom-Left</span>
              </button>
              <button
                type="button"
                onClick={() => onAutoResizeToImage?.("bottom-right")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 active:scale-98"
                title="Snap stamp directly to the bottom-right corner"
              >
                <ArrowDownRight size={13} weight="bold" />
                <span>Bottom-Right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
