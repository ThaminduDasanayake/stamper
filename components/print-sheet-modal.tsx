"use client";

import React, { useRef } from "react";
import type { StampedItem } from "@/components/stamped-collection";
import { Printer, X } from "@phosphor-icons/react";

export type PrintSheetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: StampedItem[];
};

export function PrintSheetModal({
  isOpen,
  onClose,
  items,
}: PrintSheetModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // We want to fill 9 slots in a 3x3 grid
  const displayStamps: StampedItem[] = [];
  if (items.length > 0) {
    for (let i = 0; i < 9; i++) {
      displayStamps.push(items[i % items.length]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Printable Postal Sheet (3&times;3)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Print on letter or A4 paper to cut out real stamps!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Printer size={15} />
              Print Sheet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="mt-4 flex flex-1 items-center justify-center overflow-auto rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
          <div
            ref={sheetRef}
            className="grid grid-cols-3 gap-6 bg-white p-8 shadow-md dark:bg-zinc-900 print:m-0 print:p-0 print:shadow-none dark:print:bg-white"
            style={{ width: "100%", maxWidth: "480px" }}
          >
            {displayStamps.map((stamp, idx) => (
              <div
                key={`${stamp.id}-${idx}`}
                className="flex aspect-4/5 items-center justify-center border border-dashed border-zinc-300 p-2 print:border-zinc-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stamp.previewDataUrl}
                  alt="Printed stamp"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
