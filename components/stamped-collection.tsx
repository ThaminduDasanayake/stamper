"use client";

import React from "react";
import type { StampConfig } from "@/lib/stamp-renderer";
import { downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import {
  DownloadSimple,
  CopySimple,
  Trash,
  Check,
  ArrowUUpLeft,
  Printer,
} from "@phosphor-icons/react";

export type StampedItem = {
  id: string;
  timestamp: number;
  previewDataUrl: string;
  config: StampConfig;
};

export type StampedCollectionProps = {
  items: StampedItem[];
  onSelect: (config: StampConfig) => void;
  onDelete: (id: string) => void;
  onOpenPrintSheet: () => void;
};

export function StampedCollection({
  items,
  onSelect,
  onDelete,
  onOpenPrintSheet,
}: StampedCollectionProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = async (item: StampedItem) => {
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
    downloadStampPng(item.config, `${safeTitle}-${item.timestamp}.png`);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Your Stamped Album is Empty
        </p>
        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
          Customize your stamp above and press &ldquo;Stamp It!&rdquo; to add
          your creation to this collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Stamped Album ({items.length})
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Click any stamp to load it back into the editor
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPrintSheet}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <Printer size={15} />
          Print Sheet
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-3 shadow-xs transition-all hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            {/* Click to load back into editor */}
            <button
              type="button"
              onClick={() => onSelect(item.config)}
              className="relative flex aspect-4/5 w-full cursor-pointer items-center justify-center overflow-hidden p-1"
              title="Click to edit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewDataUrl}
                alt="Stamped item"
                className="max-h-full max-w-full object-contain drop-shadow-md transition-transform group-hover:scale-105"
              />
            </button>

            {/* Stamp Meta */}
            <div className="mt-2 flex w-full items-center justify-between px-1">
              <span className="truncate text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                {item.config.country || "STAMP"}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {item.config.denomination}
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-2.5 flex w-full items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleDownload(item)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Download transparent PNG"
                >
                  <DownloadSimple size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Copy to clipboard"
                >
                  {copiedId === item.id ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <CopySimple size={14} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(item.config)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Load into editor"
                >
                  <ArrowUUpLeft size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                title="Remove from album"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
