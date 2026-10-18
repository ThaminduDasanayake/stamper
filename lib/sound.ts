/**
 * Synthesizes a tactile, mechanical rubber-stamp punch sound
 * using the Web Audio API without requiring any external audio files.
 */
export function playStampSound(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Low-frequency punch / thud
    const osc = ctx.createOscillator();
    const punchGain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

    punchGain.gain.setValueAtTime(0.8, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(punchGain);
    punchGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // 2. High-frequency paper snap / perforation click
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  } catch {
    // Graceful fallback if Web Audio is restricted
  }
}
