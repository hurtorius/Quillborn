import { Component, For, createSignal, onMount } from "solid-js";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface FontSelection {
  writing: string;
  display: string;
  ui: string;
}

const STORAGE_KEY = "quillborn-fonts";

const WRITING_FONTS = [
  { name: "EB Garamond", value: "'EB Garamond', 'Georgia', serif" },
  { name: "Georgia", value: "'Georgia', 'Times New Roman', serif" },
  { name: "Merriweather", value: "'Merriweather', serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { name: "Lora", value: "'Lora', serif" },
  { name: "Crimson Text", value: "'Crimson Text', serif" },
  { name: "Source Serif Pro", value: "'Source Serif Pro', serif" },
  { name: "Literata", value: "'Literata', serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
];

const DISPLAY_FONTS = [
  { name: "EB Garamond", value: "'EB Garamond', serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Cormorant", value: "'Cormorant', serif" },
  { name: "Merriweather", value: "'Merriweather', serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { name: "Lora", value: "'Lora', serif" },
  { name: "Spectral", value: "'Spectral', serif" },
  { name: "Georgia", value: "'Georgia', serif" },
];

const UI_FONTS = [
  { name: "Inter", value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "IBM Plex Sans", value: "'IBM Plex Sans', sans-serif" },
  { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif" },
  { name: "Nunito", value: "'Nunito', sans-serif" },
  { name: "Work Sans", value: "'Work Sans', sans-serif" },
];

const DEFAULT_FONTS: FontSelection = {
  writing: "'EB Garamond', 'Georgia', serif",
  display: "'EB Garamond', serif",
  ui: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const PREVIEW_TEXT = "The quick brown fox jumps over the lazy dog. 0123456789";
const PREVIEW_TEXT_LONG = "In the beginning was the Word, and the Word was with God, and the Word was God. The same was in the beginning with God.";

const loadSavedFonts = (): FontSelection => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_FONTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_FONTS };
};

const applyFontsToDom = (fonts: FontSelection) => {
  document.documentElement.style.setProperty("--font-canvas", fonts.writing);
  document.documentElement.style.setProperty("--font-display", fonts.display);
  document.documentElement.style.setProperty("--font-ui", fonts.ui);
};

export const FontManager: Component = () => {
  const [fonts, setFonts] = createSignal<FontSelection>(loadSavedFonts());

  onMount(() => {
    applyFontsToDom(fonts());
  });

  const updateFont = (category: keyof FontSelection, value: string) => {
    setFonts((prev) => {
      const next = { ...prev, [category]: value };
      applyFontsToDom(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleReset = () => {
    setFonts({ ...DEFAULT_FONTS });
    applyFontsToDom(DEFAULT_FONTS);
    localStorage.removeItem(STORAGE_KEY);
    // Remove overrides, let CSS take over
    document.documentElement.style.removeProperty("--font-canvas");
    document.documentElement.style.removeProperty("--font-display");
    document.documentElement.style.removeProperty("--font-ui");
  };

  return (
    <Panel title="Font Manager">
      <div class="font-manager">
        <section class="font-manager__section">
          <h3 class="font-manager__section-title">Writing Font</h3>
          <p class="font-manager__section-hint">Used for the main writing canvas</p>
          <select
            class="font-manager__select"
            value={fonts().writing}
            onChange={(e) => updateFont("writing", e.currentTarget.value)}
          >
            <For each={WRITING_FONTS}>
              {(font) => <option value={font.value}>{font.name}</option>}
            </For>
          </select>
          <div
            class="font-manager__preview font-manager__preview--large"
            style={{ "font-family": fonts().writing }}
          >
            {PREVIEW_TEXT_LONG}
          </div>
        </section>

        <section class="font-manager__section">
          <h3 class="font-manager__section-title">Display Font</h3>
          <p class="font-manager__section-hint">Used for headings and chapter titles</p>
          <select
            class="font-manager__select"
            value={fonts().display}
            onChange={(e) => updateFont("display", e.currentTarget.value)}
          >
            <For each={DISPLAY_FONTS}>
              {(font) => <option value={font.value}>{font.name}</option>}
            </For>
          </select>
          <div
            class="font-manager__preview font-manager__preview--display"
            style={{ "font-family": fonts().display }}
          >
            {PREVIEW_TEXT}
          </div>
        </section>

        <section class="font-manager__section">
          <h3 class="font-manager__section-title">UI Font</h3>
          <p class="font-manager__section-hint">Used for menus, buttons, and interface elements</p>
          <select
            class="font-manager__select"
            value={fonts().ui}
            onChange={(e) => updateFont("ui", e.currentTarget.value)}
          >
            <For each={UI_FONTS}>
              {(font) => <option value={font.value}>{font.name}</option>}
            </For>
          </select>
          <div
            class="font-manager__preview"
            style={{ "font-family": fonts().ui }}
          >
            {PREVIEW_TEXT}
          </div>
        </section>

        <div class="font-manager__actions">
          <Button variant="danger" size="sm" onClick={handleReset}>
            Reset to Default
          </Button>
        </div>
      </div>

      <style>{`
        .font-manager {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          padding: var(--space-md) 0;
        }

        .font-manager__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .font-manager__section-title {
          font-family: var(--font-ui);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-ghost);
        }

        .font-manager__section-hint {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          margin-top: calc(-1 * var(--space-xs));
        }

        .font-manager__select {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: var(--color-bone);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          outline: none;
          width: 100%;
        }

        .font-manager__select:focus {
          border-color: var(--color-accent);
        }

        .font-manager__preview {
          padding: var(--space-md);
          background: var(--color-bone);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          font-size: var(--font-size-base);
          color: var(--color-ink);
          line-height: 1.6;
        }

        .font-manager__preview--large {
          font-size: var(--font-size-canvas);
          line-height: 1.8;
        }

        .font-manager__preview--display {
          font-size: var(--font-size-xl);
          font-weight: 600;
          line-height: 1.4;
        }

        .font-manager__actions {
          display: flex;
          gap: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--color-border-subtle);
        }
      `}</style>
    </Panel>
  );
};
