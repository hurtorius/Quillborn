import { Component, For, Show, createSignal, createRoot } from "solid-js";

export type AmbientProfile = "rain" | "fireplace" | "wind" | "ocean" | "forest" | "silence";
export type KeystrokeSound = "mechanical" | "soft" | "pen" | "none";

function createSoundStore() {
  const [ambientProfile, setAmbientProfile] = createSignal<AmbientProfile>(
    (localStorage.getItem("quillborn-ambient") as AmbientProfile) || "silence"
  );
  const [keystrokeSound, setKeystrokeSound] = createSignal<KeystrokeSound>(
    (localStorage.getItem("quillborn-keystroke") as KeystrokeSound) || "none"
  );
  const [volume, setVolume] = createSignal(
    parseFloat(localStorage.getItem("quillborn-volume") || "0.3")
  );

  // Audio context (lazily created)
  let audioCtx: AudioContext | null = null;
  let ambientSource: OscillatorNode | null = null;
  let ambientGain: GainNode | null = null;

  const getAudioCtx = () => {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  };

  const changeAmbient = (profile: AmbientProfile) => {
    setAmbientProfile(profile);
    localStorage.setItem("quillborn-ambient", profile);
    stopAmbient();
    if (profile !== "silence") startAmbient(profile);
  };

  const startAmbient = (profile: AmbientProfile) => {
    try {
      const ctx = getAudioCtx();
      ambientGain = ctx.createGain();
      ambientGain.gain.value = volume() * 0.1;
      ambientGain.connect(ctx.destination);

      // Generate simple noise-based ambient (placeholder for real audio files)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Different filter profiles per ambient type
      const filter = ctx.createBiquadFilter();
      switch (profile) {
        case "rain": filter.frequency.value = 800; filter.type = "lowpass"; break;
        case "fireplace": filter.frequency.value = 400; filter.type = "lowpass"; break;
        case "wind": filter.frequency.value = 2000; filter.type = "bandpass"; break;
        case "ocean": filter.frequency.value = 300; filter.type = "lowpass"; break;
        case "forest": filter.frequency.value = 1200; filter.type = "bandpass"; break;
      }
      source.connect(filter);
      filter.connect(ambientGain);
      source.start();
    } catch {
      // Web Audio may not be available
    }
  };

  const stopAmbient = () => {
    if (ambientGain) {
      ambientGain.disconnect();
      ambientGain = null;
    }
  };

  const changeKeystroke = (sound: KeystrokeSound) => {
    setKeystrokeSound(sound);
    localStorage.setItem("quillborn-keystroke", sound);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    localStorage.setItem("quillborn-volume", String(v));
    if (ambientGain) ambientGain.gain.value = v * 0.1;
  };

  const playKeystroke = () => {
    if (keystrokeSound() === "none") return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = volume() * 0.02;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      switch (keystrokeSound()) {
        case "mechanical": osc.frequency.value = 800 + Math.random() * 200; break;
        case "soft": osc.frequency.value = 400 + Math.random() * 100; break;
        case "pen": osc.frequency.value = 1200 + Math.random() * 300; break;
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore
    }
  };

  return {
    ambientProfile, changeAmbient,
    keystrokeSound, changeKeystroke,
    volume, changeVolume,
    playKeystroke,
  };
}

export const soundStore = createRoot(createSoundStore);

export const SoundPanel: Component = () => {
  const ambientOptions: { id: AmbientProfile; label: string }[] = [
    { id: "silence", label: "Silence" },
    { id: "rain", label: "Rain" },
    { id: "fireplace", label: "Fireplace" },
    { id: "wind", label: "Wind" },
    { id: "ocean", label: "Ocean" },
    { id: "forest", label: "Forest" },
  ];

  const keystrokeOptions: { id: KeystrokeSound; label: string }[] = [
    { id: "none", label: "None" },
    { id: "mechanical", label: "Mechanical" },
    { id: "soft", label: "Soft" },
    { id: "pen", label: "Pen on Paper" },
  ];

  return (
    <div class="sound-panel">
      <div class="sound-panel__section">
        <label class="sound-panel__label">Ambient</label>
        <div class="sound-panel__options">
          <For each={ambientOptions}>
            {(opt) => (
              <button
                class={`sound-panel__option ${soundStore.ambientProfile() === opt.id ? "sound-panel__option--active" : ""}`}
                onClick={() => soundStore.changeAmbient(opt.id)}
              >{opt.label}</button>
            )}
          </For>
        </div>
      </div>
      <div class="sound-panel__section">
        <label class="sound-panel__label">Keystrokes</label>
        <div class="sound-panel__options">
          <For each={keystrokeOptions}>
            {(opt) => (
              <button
                class={`sound-panel__option ${soundStore.keystrokeSound() === opt.id ? "sound-panel__option--active" : ""}`}
                onClick={() => soundStore.changeKeystroke(opt.id)}
              >{opt.label}</button>
            )}
          </For>
        </div>
      </div>
      <div class="sound-panel__section">
        <label class="sound-panel__label">Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={soundStore.volume()}
          onInput={(e) => soundStore.changeVolume(parseFloat(e.currentTarget.value))}
          class="sound-panel__slider"
        />
      </div>

      <style>{`
        .sound-panel {
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .sound-panel__section { display: flex; flex-direction: column; gap: var(--space-xs); }
        .sound-panel__label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        .sound-panel__options { display: flex; flex-wrap: wrap; gap: 4px; }
        .sound-panel__option {
          font-size: var(--font-size-xs);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          color: var(--color-ghost);
          border: 1px solid var(--color-border-subtle);
          transition: all var(--transition-fast);
        }
        .sound-panel__option:hover { color: var(--color-ink); border-color: var(--color-border); }
        .sound-panel__option--active {
          color: var(--color-accent);
          border-color: var(--color-accent);
          background: var(--color-accent-muted);
        }
        .sound-panel__slider {
          width: 100%;
          accent-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
};
