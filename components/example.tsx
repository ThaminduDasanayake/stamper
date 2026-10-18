import Image from "next/image";
import { Stamp } from "@/components/stamp";

const stageGridStyle = {
  backgroundImage:
    "linear-gradient(var(--color-grayscale-4) 1px, transparent 1px), linear-gradient(90deg, var(--color-grayscale-4) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  maskImage: "radial-gradient(circle at center, black, transparent 76%)",
};

export function StampShowcase() {
  return (
    <div className="border-grayscale-3 bg-grayscale-1 small-shadow dark:border-grayscale-4 dark:bg-grayscale-3 w-full overflow-hidden rounded-[13px] border dark:shadow-none">
      <div className="bg-grayscale-1 dark:bg-grayscale-2 relative flex min-h-[460px] items-center justify-center overflow-hidden px-6 py-10 max-[520px]:min-h-[410px] max-[520px]:px-5 max-[520px]:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.38]"
          style={stageGridStyle}
        />

        <Stamp
          aria-label="Retro pixel landscape postage stamp"
          className="z-[1] w-[198px] -rotate-2 transform-gpu transition-transform duration-200 ease-out hover:scale-[1.015] hover:rotate-0 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:-rotate-2 max-[520px]:w-[180px]"
        >
          <Image
            alt="A retro pixel-art sunset over mountains and a lake"
            className="object-cover [image-rendering:pixelated]"
            draggable={false}
            fill
            preload
            sizes="(max-width: 520px) 188px, 220px"
            src="/experiments/stamp/retro-landscape.png"
          />
          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-3 text-white drop-shadow-[0_1px_1px_rgb(0_0_0_/_52%)]">
            <span className="font-mono text-[8px] leading-none font-bold tracking-[0.12em] uppercase">
              Pixel Parks
            </span>
            <strong className="font-mono text-[17px] leading-[0.8] font-bold tracking-[-0.08em]">
              24
            </strong>
          </div>
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 font-mono text-[7px] leading-none font-bold tracking-[0.1em] text-white uppercase drop-shadow-[0_1px_1px_rgb(0_0_0_/_52%)]">
            Field archive · 01
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(24_23_19_/_18%)]"
          />
        </Stamp>
      </div>
    </div>
  );
}
