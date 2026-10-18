"use client";

import React, { useRef } from "react";
import type { StampConfig, StampFilter } from "@/lib/stamp-renderer";
import { SAMPLE_STAMPS } from "@/lib/sample-stamps";
import {
  UploadSimple,
  Image as ImageIcon,
  Palette,
  ArrowsClockwise,
  EnvelopeSimple,
} from "@phosphor-icons/react";

export type StampControlsProps = {
  config: StampConfig;
  onChange: (patch: Partial<StampConfig>) => void;
  onResetPanZoom: () => void;
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

export function StampControls({
  config,
  onChange,
  onResetPanZoom,
}: StampControlsProps) {
  const [activeTab, setActiveTab] = React.useState<
    "image" | "paper" | "postal"
  >("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        onChange({
          imageUrl: url,
          panX: 0,
          panY: 0,
          zoom: 1,
          rotation: 0,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePickSample = (sampleId: string) => {
    const sample = SAMPLE_STAMPS.find((s) => s.id === sampleId);
    if (!sample) return;

    // Convert SVG to data URI
    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(sample.svg)}`;
    onChange({
      imageUrl: svgDataUri,
      country: sample.suggestedCountry,
      denomination: sample.suggestedDenomination,
      paperColor: sample.suggestedPaper,
      inkColor: sample.suggestedInk,
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
    });
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === "image"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <ImageIcon size={16} />
          Image
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("paper")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === "paper"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Palette size={16} />
          Paper & Ink
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("postal")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === "postal"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <EnvelopeSimple size={16} />
          Postmark
        </button>
      </div>

      {/* Tab 1: Image & Adjustments */}
      {activeTab === "image" && (
        <div className="mt-5 space-y-5">
          {/* Upload Button & File Input */}
          <div>
            <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Upload Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <UploadSimple size={18} className="text-zinc-500" />
                Upload Photo from Device
              </button>
            </div>
          </div>

          {/* Preset Artworks */}
          <div>
            <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Or Choose Preset Artwork
            </label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {SAMPLE_STAMPS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handlePickSample(sample.id)}
                  className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 text-center transition-all hover:border-zinc-400 hover:shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500"
                  title={sample.name}
                >
                  <div
                    className="size-10 overflow-hidden rounded-xs"
                    dangerouslySetInnerHTML={{ __html: sample.svg }}
                  />
                  <span className="mt-1 w-full truncate text-[9px] font-medium text-zinc-600 dark:text-zinc-400">
                    {sample.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Zoom Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Zoom Scale
              </span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {Math.round(config.zoom * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={config.zoom}
              onChange={(e) => onChange({ zoom: parseFloat(e.target.value) })}
              className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
            />
          </div>

          {/* Rotation & Reset Pan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Rotation
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {config.rotation}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={config.rotation}
                onChange={(e) =>
                  onChange({ rotation: parseInt(e.target.value, 10) })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onResetPanZoom}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ArrowsClockwise size={14} />
                Reset Fit
              </button>
            </div>
          </div>

          {/* Vintage Filter Style */}
          <div>
            <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Postal Filter Effect
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange({ filter: f.id })}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    config.filter === f.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Paper, Ink & Perforations */}
      {activeTab === "paper" && (
        <div className="mt-5 space-y-5">
          {/* Paper Palette */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Paper Color
              </label>
              <input
                type="color"
                value={config.paperColor}
                onChange={(e) => onChange({ paperColor: e.target.value })}
                className="size-5 cursor-pointer rounded-xs border-0 bg-transparent"
                title="Custom color picker"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAPER_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => onChange({ paperColor: preset.hex })}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    config.paperColor.toLowerCase() === preset.hex.toLowerCase()
                      ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                  }`}
                >
                  <span
                    className="size-3 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ink Palette */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Ink Color
              </label>
              <input
                type="color"
                value={config.inkColor}
                onChange={(e) => onChange({ inkColor: e.target.value })}
                className="size-5 cursor-pointer rounded-xs border-0 bg-transparent"
                title="Custom ink picker"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {INK_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => onChange({ inkColor: preset.hex })}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    config.inkColor.toLowerCase() === preset.hex.toLowerCase()
                      ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                  }`}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Stamp Proportion
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(
                [
                  { id: "4/5", label: "Portrait 4:5" },
                  { id: "1/1", label: "Square 1:1" },
                  { id: "5/4", label: "Landscape 5:4" },
                  { id: "3/4", label: "Tall 3:4" },
                ] as const
              ).map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => onChange({ aspectRatio: ar.id })}
                  className={`rounded-lg py-2 text-center text-xs font-semibold transition-all ${
                    config.aspectRatio === ar.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {/* Perforation Depth & Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Perforation Depth
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
                  onChange({ perforationDepth: parseFloat(e.target.value) })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Inner Padding
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {config.padding}px
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="26"
                step="1"
                value={config.padding}
                onChange={(e) =>
                  onChange({ padding: parseInt(e.target.value, 10) })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  H-Perforations
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
                  onChange({
                    horizontalPerforations: parseInt(e.target.value, 10),
                  })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  V-Perforations
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
                  onChange({
                    verticalPerforations: parseInt(e.target.value, 10),
                  })
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Postmark & Postal Typography */}
      {activeTab === "postal" && (
        <div className="mt-5 space-y-5">
          {/* Country & Denomination Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Country / Header
              </label>
              <input
                type="text"
                value={config.country}
                onChange={(e) => onChange({ country: e.target.value })}
                placeholder="e.g. POSTAGE"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Denomination
              </label>
              <input
                type="text"
                value={config.denomination}
                onChange={(e) => onChange({ denomination: e.target.value })}
                placeholder="e.g. 50¢ or €1.20"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Subtitle / Footer (Optional)
            </label>
            <input
              type="text"
              value={config.subtitle || ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="e.g. SPECIAL DELIVERY"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100"
            />
          </div>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {/* Toggle Postmark */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold tracking-wide text-zinc-700 dark:text-zinc-200">
                  Enable Cancellation Postmark
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Adds an authentic ink cancellation rubber stamp
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({ enablePostmark: !config.enablePostmark })
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
              <div className="mt-4 space-y-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
                {/* Postmark Style */}
                <div>
                  <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                    Postmark Style
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "classic-wavy", label: "Classic Wavy" },
                        { id: "double-circle", label: "Double Circle" },
                        { id: "airmail-triangle", label: "Airmail Triangle" },
                        { id: "bars-only", label: "Killer Bars" },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onChange({ postmarkStyle: st.id })}
                        className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                          config.postmarkStyle === st.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                      Postmark City
                    </label>
                    <input
                      type="text"
                      value={config.postmarkCity}
                      onChange={(e) =>
                        onChange({ postmarkCity: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                      Cancellation Date
                    </label>
                    <input
                      type="text"
                      value={config.postmarkDate}
                      onChange={(e) =>
                        onChange({ postmarkDate: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Postmark Color & Slant */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                      Postmark Ink
                    </label>
                    <div className="mt-1 flex gap-2">
                      {POSTMARK_COLORS.map((pc) => (
                        <button
                          key={pc.hex}
                          type="button"
                          onClick={() => onChange({ postmarkColor: pc.hex })}
                          className={`size-6 rounded-full border transition-transform ${
                            config.postmarkColor.toLowerCase() ===
                            pc.hex.toLowerCase()
                              ? "scale-110 ring-2 ring-zinc-900 dark:ring-zinc-100"
                              : "border-black/20"
                          }`}
                          style={{ backgroundColor: pc.hex }}
                          title={pc.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                        Slant Angle
                      </span>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">
                        {config.postmarkRotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="3"
                      value={config.postmarkRotation}
                      onChange={(e) =>
                        onChange({
                          postmarkRotation: parseInt(e.target.value, 10),
                        })
                      }
                      className="mt-1 w-full accent-zinc-900 dark:accent-zinc-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
