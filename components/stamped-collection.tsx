"use client";

import React, { useState, useMemo } from "react";
import type { StampConfig } from "@/lib/stamp-renderer";
import { downloadStampPng, copyStampToClipboard } from "@/lib/stamp-renderer";
import {
  DownloadSimple,
  CopySimple,
  Trash,
  Check,
  ArrowUUpLeft,
  Printer,
  MagnifyingGlass,
  PaintBrush,
  Archive,
  Funnel,
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
  onClearAll: () => void;
  onOpenPrintSheet: () => void;
  onGoToStudio: () => void;
};

export function StampedCollection({
  items,
  onSelect,
  onDelete,
  onClearAll,
  onOpenPrintSheet,
  onGoToStudio,
}: StampedCollectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aspectFilter, setAspectFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

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

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesCountry = (item.config.country || "")
            .toLowerCase()
            .includes(q);
          const matchesDenom = (item.config.denomination || "")
            .toLowerCase()
            .includes(q);
          const matchesSub = (item.config.subtitle || "")
            .toLowerCase()
            .includes(q);
          if (!matchesCountry && !matchesDenom && !matchesSub) {
            return false;
          }
        }

        // Aspect filter
        if (
          aspectFilter !== "all" &&
          item.config.aspectRatio !== aspectFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        return sortOrder === "newest"
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp;
      });
  }, [items, searchQuery, aspectFilter, sortOrder]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Archive size={32} weight="light" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-800 dark:text-zinc-200">
          Your Stamp Album is Empty
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Create and stamp your first perforated postage stamp in the Studio.
          Once stamped, it will be safely archived here in your collection.
        </p>
        <button
          type="button"
          onClick={onGoToStudio}
          className="mt-6 flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 hover:shadow-lg dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PaintBrush size={16} weight="bold" />
          Open Studio to Make a Stamp
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Album Header Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-xs backdrop-blur-md sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/80 dark:bg-zinc-900/70">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              Stamp Collection Album
            </h2>
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {items.length} {items.length === 1 ? "stamp" : "stamps"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Browse, inspect, and export your archived postage creations
          </p>
        </div>

        {/* Global Album Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToStudio}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <PaintBrush size={15} weight="bold" />
            New Stamp
          </button>

          <button
            type="button"
            onClick={onOpenPrintSheet}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Printer size={15} />
            Print Sheet
          </button>

          {items.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/20"
              title="Clear all stamps"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl bg-zinc-100/70 p-2 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-800/50">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by country, denomination, city..."
            className="w-full rounded-lg border-0 bg-white py-1.5 pr-3 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/20 focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-100/20"
          />
        </div>

        {/* Aspect Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="flex items-center gap-1 pl-2 text-[11px] font-semibold text-zinc-400">
            <Funnel size={12} />
            Ratio:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "4/5", label: "4:5" },
            { id: "1/1", label: "1:1" },
            { id: "5/4", label: "5:4" },
            { id: "3/4", label: "3:4" },
            { id: "auto", label: "Auto" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAspectFilter(f.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                aspectFilter === f.id
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "newest" | "oldest")
            }
            className="ml-2 rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Grid of Stamped Items */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          No stamps match your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs transition-all hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              {/* Preview image */}
              <button
                type="button"
                onClick={() => onSelect(item.config)}
                className="relative flex aspect-4/5 w-full cursor-pointer items-center justify-center p-1.5 transition-transform group-hover:scale-102"
                title="Click to edit in Studio"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewDataUrl}
                  alt={`Stamp ${item.config.country || ""}`}
                  className="max-h-full max-w-full object-contain drop-shadow-md"
                />
              </button>

              {/* Stamp Info */}
              <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {item.config.country || "POSTAGE"}
                  </span>
                  <span className="font-mono text-xs font-extrabold text-zinc-600 dark:text-zinc-400">
                    {item.config.denomination}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>
                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full border border-black/10"
                      style={{ backgroundColor: item.config.paperColor }}
                      title="Paper color"
                    />
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: item.config.inkColor }}
                      title="Ink color"
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => onSelect(item.config)}
                    className="flex items-center gap-1 text-[11px] font-bold text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    title="Load into Studio"
                  >
                    <ArrowUUpLeft size={13} />
                    Edit
                  </button>

                  <div className="flex items-center gap-1">
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
                      onClick={() => onDelete(item.id)}
                      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                      title="Delete from collection"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
