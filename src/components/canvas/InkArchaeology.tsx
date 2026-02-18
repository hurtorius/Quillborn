import { Component, createSignal, createMemo, Show } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";

export const InkArchaeology: Component = () => {
  const { store } = manuscriptStore;
  const [sliderValue, setSliderValue] = createSignal(100);
  const [snapshots, setSnapshots] = createSignal<{ name: string; timestamp: string }[]>([]);
  const [visible, setVisible] = createSignal(false);

  const loadSnapshots = async () => {
    if (!store.project) return;
    try {
      const { readDir } = await import("@tauri-apps/plugin-fs");
      const entries = await readDir(`${store.project.path}/snapshots`);
      const snaps = entries
        .filter((e: any) => e.name?.endsWith(".json"))
        .map((e: any) => ({
          name: e.name!,
          timestamp: e.name!.split("-manual")[0].replace("T", " ").replace(/-/g, ":"),
        }))
        .sort((a: any, b: any) => b.name.localeCompare(a.name));
      setSnapshots(snaps);
    } catch {
      setSnapshots([]);
    }
  };

  const toggleVisible = () => {
    const next = !visible();
    setVisible(next);
    if (next) loadSnapshots();
  };

  const snapshotCount = createMemo(() => snapshots().length);

  return (
    <Show when={visible()}>
      <div class="ink-archaeology">
        <div class="ink-archaeology__header">
          <span class="ink-archaeology__title">Ink Archaeology</span>
          <span class="ink-archaeology__count">{snapshotCount()} snapshots</span>
          <button class="ink-archaeology__close" onClick={toggleVisible}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div class="ink-archaeology__slider-area">
          <input
            type="range"
            class="ink-archaeology__slider"
            min="0"
            max="100"
            value={sliderValue()}
            onInput={(e) => setSliderValue(parseInt(e.currentTarget.value))}
          />
          <div class="ink-archaeology__timeline">
            <span class="ink-archaeology__label">Past</span>
            <span class="ink-archaeology__label">{sliderValue()}%</span>
            <span class="ink-archaeology__label">Present</span>
          </div>
        </div>

        <style>{`
          .ink-archaeology {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--color-surface);
            border-top: 1px solid var(--color-border);
            padding: var(--space-sm) var(--space-md);
            z-index: 50;
            animation: surface-from-below var(--transition-base) ease both;
          }
          .ink-archaeology__header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-sm);
          }
          .ink-archaeology__title {
            font-size: var(--font-size-xs);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-ghost);
          }
          .ink-archaeology__count {
            font-size: 10px;
            color: var(--color-ghost);
            opacity: 0.7;
            flex: 1;
          }
          .ink-archaeology__close {
            color: var(--color-ghost);
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
          }
          .ink-archaeology__close:hover { background: var(--color-bone-dust); color: var(--color-ink); }
          .ink-archaeology__slider-area {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .ink-archaeology__slider {
            width: 100%;
            accent-color: var(--color-accent);
          }
          .ink-archaeology__timeline {
            display: flex;
            justify-content: space-between;
          }
          .ink-archaeology__label {
            font-size: 9px;
            color: var(--color-ghost);
          }
        `}</style>
      </div>
    </Show>
  );
};

// Export the toggle function for command palette
export let toggleInkArchaeology: () => void = () => {};
