"use client";

import React, { useRef, useState } from "react";
import type { StampConfig } from "@/lib/stamp-renderer";
import type { StampedItem } from "@/components/stamped-collection";
import type { StampCutterState } from "@/components/canvas-workspace";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import { processImageFile } from "@/lib/image-utils";
import { downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import {
  UploadSimple,
  SealCheck,
  Archive,
  DownloadSimple,
  CopySimple,
  Check,
  Trash,
  Printer,
  Sparkle,
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
  onAutoResizeToImage?: (mode?: "full" | "half") => void;
  isStamping?: boolean;
};

export function StudioSidebar({
  config,
  collection,
  onChangeConfig,
  onResetCutter,
  onStampOut,
  onSelectFromCollection,
  onDeleteFromCollection,
  onOpenPrintSheet,
  isStamping = false,
}: StudioSidebarProps) {
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
      country: sample.name.split(" ")[0] || "Pixel Parks",
      denomination: sample.suggestedDenomination || "24",
      subtitle: "Field archive · 01",
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

        {/* Label & Number (clean and minimal) */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5">
          <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Stamp Label
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <span className="text-[9px] font-medium text-zinc-500">
                Title
              </span>
              <input
                type="text"
                value={config.country || ""}
                onChange={(e) => onChangeConfig({ country: e.target.value })}
                placeholder="Pixel Parks"
                className="mt-0.5 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-white outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <span className="text-[9px] font-medium text-zinc-500">
                Number
              </span>
              <input
                type="text"
                value={config.denomination || ""}
                onChange={(e) =>
                  onChangeConfig({ denomination: e.target.value })
                }
                placeholder="24"
                className="mt-0.5 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-white outline-none focus:border-zinc-600"
              />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[9px] font-medium text-zinc-500">
              Archive Tag
            </span>
            <input
              type="text"
              value={config.subtitle || ""}
              onChange={(e) => onChangeConfig({ subtitle: e.target.value })}
              placeholder="Field archive · 01"
              className="mt-0.5 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Stamped Collection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Archive size={14} />
              <span>Stamped Collection</span>
              <span className="py-0.2 rounded-full bg-zinc-800 px-2 font-mono text-[10px] text-zinc-300">
                {collection.length}
              </span>
            </div>
            {collection.length > 0 && (
              <button
                type="button"
                onClick={onOpenPrintSheet}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
              >
                <Printer size={13} />
                <span>Sheet</span>
              </button>
            )}
          </div>

          {collection.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No stamps yet. Hover on the photo and click to stamp!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {collection.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 transition-all hover:border-zinc-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewDataUrl}
                    alt="Stamped preview"
                    className="h-28 w-full cursor-pointer rounded-sm object-contain"
                    onClick={() => onSelectFromCollection(item)}
                  />
                  <div className="mt-1 flex items-center justify-between px-1">
                    <span className="truncate font-mono text-[9px] font-bold text-zinc-400">
                      {item.config.country || "Stamp"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyItem(item)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        title="Copy PNG"
                      >
                        {copiedId === item.id ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <CopySimple size={11} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadItem(item)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        title="Download PNG"
                      >
                        <DownloadSimple size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteFromCollection(item.id)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
