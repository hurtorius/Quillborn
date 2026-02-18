import { Component, For, createSignal } from "solid-js";
import { themeStore } from "@/stores/theme";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface ThemeVariable {
  key: string;
  label: string;
  type: "color" | "font" | "range";
  cssVar: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

const COLOR_VARIABLES: ThemeVariable[] = [
  { key: "accent", label: "Accent Color", type: "color", cssVar: "--color-accent" },
  { key: "ink", label: "Ink Color", type: "color", cssVar: "--color-ink" },
  { key: "bone", label: "Bone Color", type: "color", cssVar: "--color-bone" },
  { key: "surface", label: "Surface Color", type: "color", cssVar: "--color-surface" },
  { key: "surfaceRaised", label: "Surface Raised", type: "color", cssVar: "--color-surface-raised" },
  { key: "ghost", label: "Ghost Color", type: "color", cssVar: "--color-ghost" },
  { key: "boneDust", label: "Bone Dust", type: "color", cssVar: "--color-bone-dust" },
  { key: "border", label: "Border Color", type: "color", cssVar: "--color-border" },
];

const FONT_VARIABLES: ThemeVariable[] = [
  {
    key: "fontDisplay",
    label: "Display Font",
    type: "font",
    cssVar: "--font-display",
    options: [
      "'EB Garamond', serif",
      "'Georgia', serif",
      "'Playfair Display', serif",
      "'Merriweather', serif",
      "'Libre Baskerville', serif",
      "'Crimson Text', serif",
      "'Lora', serif",
    ],
  },
  {
    key: "fontCanvas",
    label: "Body / Writing Font",
    type: "font",
    cssVar: "--font-canvas",
    options: [
      "'EB Garamond', 'Georgia', serif",
      "'Georgia', 'Times New Roman', serif",
      "'Merriweather', serif",
      "'Libre Baskerville', serif",
      "'Lora', serif",
      "'Source Serif Pro', serif",
      "'Inter', sans-serif",
      "'Literata', serif",
    ],
  },
  {
    key: "fontUi",
    label: "UI Font",
    type: "font",
    cssVar: "--font-ui",
    options: [
      "'Inter', -apple-system, sans-serif",
      "'Roboto', sans-serif",
      "'Open Sans', sans-serif",
      "'Lato', sans-serif",
      "'IBM Plex Sans', sans-serif",
      "'Source Sans Pro', sans-serif",
    ],
  },
  {
    key: "fontMono",
    label: "Monospace Font",
    type: "font",
    cssVar: "--font-mono",
    options: [
      "'JetBrains Mono', monospace",
      "'Fira Code', monospace",
      "'Cascadia Code', monospace",
      "'Source Code Pro', monospace",
      "'IBM Plex Mono', monospace",
      "'Inconsolata', monospace",
    ],
  },
];

const RANGE_VARIABLES: ThemeVariable[] = [
  { key: "grainOpacity", label: "Grain Opacity", type: "range", cssVar: "--grain-opacity", min: 0, max: 0.15, step: 0.005 },
  { key: "vignetteOpacity", label: "Vignette Opacity", type: "range", cssVar: "--vignette-opacity", min: 0, max: 0.3, step: 0.01 },
];

const STORAGE_KEY = "quillborn-custom-theme";

interface ThemeValues {
  [key: string]: string;
}

const getComputedVar = (cssVar: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
};

const rgbToHex = (rgb: string): string => {
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
};

const loadSavedTheme = (): ThemeValues => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
};

export const ThemeEditor: Component = () => {
  const [values, setValues] = createSignal<ThemeValues>(loadSavedTheme());
  const [exportData, setExportData] = createSignal("");
  const [showExport, setShowExport] = createSignal(false);

  const getValue = (variable: ThemeVariable): string => {
    const saved = values()[variable.key];
    if (saved) return saved;
    const computed = getComputedVar(variable.cssVar);
    if (variable.type === "color") return rgbToHex(computed);
    return computed;
  };

  const applyVariable = (variable: ThemeVariable, value: string) => {
    document.documentElement.style.setProperty(variable.cssVar, value);

    // For accent color, also update muted/selection variants
    if (variable.key === "accent") {
      themeStore.applyAccent(value);
    }

    setValues((prev) => {
      const next = { ...prev, [variable.key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleResetToDefault = () => {
    // Remove all custom properties
    const allVars = [...COLOR_VARIABLES, ...FONT_VARIABLES, ...RANGE_VARIABLES];
    for (const v of allVars) {
      document.documentElement.style.removeProperty(v.cssVar);
    }
    setValues({});
    localStorage.removeItem(STORAGE_KEY);
    // Re-apply theme defaults
    themeStore.init();
  };

  const handleExport = () => {
    const allVars = [...COLOR_VARIABLES, ...FONT_VARIABLES, ...RANGE_VARIABLES];
    const themeData: ThemeValues = {};
    for (const v of allVars) {
      themeData[v.cssVar] = getComputedVar(v.cssVar) || getValue(v);
    }
    setExportData(JSON.stringify(themeData, null, 2));
    setShowExport(true);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(exportData()) as ThemeValues;
      const allVars = [...COLOR_VARIABLES, ...FONT_VARIABLES, ...RANGE_VARIABLES];
      const newValues: ThemeValues = {};

      for (const v of allVars) {
        if (data[v.cssVar]) {
          document.documentElement.style.setProperty(v.cssVar, data[v.cssVar]);
          newValues[v.key] = data[v.cssVar];
        }
      }

      setValues(newValues);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValues));
      setShowExport(false);
    } catch {
      // Invalid JSON
    }
  };

  return (
    <Panel title="Theme Editor">
      <div class="theme-editor">
        <section class="theme-editor__section">
          <h3 class="theme-editor__section-title">Colors</h3>
          <div class="theme-editor__grid">
            <For each={COLOR_VARIABLES}>
              {(variable) => (
                <div class="theme-editor__field">
                  <label class="theme-editor__label">{variable.label}</label>
                  <div class="theme-editor__color-row">
                    <input
                      type="color"
                      class="theme-editor__color-picker"
                      value={getValue(variable)}
                      onInput={(e) => applyVariable(variable, e.currentTarget.value)}
                    />
                    <span class="theme-editor__color-value">{getValue(variable)}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="theme-editor__section">
          <h3 class="theme-editor__section-title">Fonts</h3>
          <div class="theme-editor__grid theme-editor__grid--single">
            <For each={FONT_VARIABLES}>
              {(variable) => (
                <div class="theme-editor__field">
                  <label class="theme-editor__label">{variable.label}</label>
                  <select
                    class="theme-editor__select"
                    value={getValue(variable)}
                    onChange={(e) => applyVariable(variable, e.currentTarget.value)}
                  >
                    <For each={variable.options!}>
                      {(opt) => (
                        <option value={opt} style={{ "font-family": opt }}>
                          {opt.split(",")[0].replace(/'/g, "")}
                        </option>
                      )}
                    </For>
                  </select>
                  <span
                    class="theme-editor__font-preview"
                    style={{ "font-family": getValue(variable) }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </span>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="theme-editor__section">
          <h3 class="theme-editor__section-title">Effects</h3>
          <div class="theme-editor__grid theme-editor__grid--single">
            <For each={RANGE_VARIABLES}>
              {(variable) => (
                <div class="theme-editor__field">
                  <label class="theme-editor__label">
                    {variable.label}
                    <span class="theme-editor__range-value">
                      {parseFloat(getValue(variable) || "0").toFixed(3)}
                    </span>
                  </label>
                  <input
                    type="range"
                    class="theme-editor__range"
                    min={variable.min}
                    max={variable.max}
                    step={variable.step}
                    value={parseFloat(getValue(variable) || "0")}
                    onInput={(e) => applyVariable(variable, e.currentTarget.value)}
                  />
                </div>
              )}
            </For>
          </div>
        </section>

        <div class="theme-editor__actions">
          <Button variant="danger" size="sm" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            Export Theme
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowExport(!showExport())}>
            Import Theme
          </Button>
        </div>

        {showExport() && (
          <div class="theme-editor__export">
            <textarea
              class="theme-editor__export-textarea"
              value={exportData()}
              onInput={(e) => setExportData(e.currentTarget.value)}
              placeholder="Paste theme JSON here to import, or export to see current theme..."
              rows={8}
            />
            <div class="theme-editor__export-actions">
              <Button variant="primary" size="sm" onClick={handleImport}>
                Apply Imported Theme
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .theme-editor {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          padding: var(--space-md) 0;
        }

        .theme-editor__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .theme-editor__section-title {
          font-family: var(--font-ui);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-ghost);
          margin-bottom: var(--space-xs);
        }

        .theme-editor__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm) var(--space-md);
        }

        .theme-editor__grid--single {
          grid-template-columns: 1fr;
        }

        .theme-editor__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .theme-editor__label {
          font-size: var(--font-size-xs);
          color: var(--color-ink);
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .theme-editor__color-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .theme-editor__color-picker {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          background: none;
        }

        .theme-editor__color-picker::-webkit-color-swatch-wrapper {
          padding: 2px;
        }

        .theme-editor__color-picker::-webkit-color-swatch {
          border: none;
          border-radius: 2px;
        }

        .theme-editor__color-value {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .theme-editor__select {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: var(--color-bone);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-xs) var(--space-sm);
          cursor: pointer;
          outline: none;
        }

        .theme-editor__select:focus {
          border-color: var(--color-accent);
        }

        .theme-editor__font-preview {
          font-size: var(--font-size-sm);
          color: var(--color-ink-wash);
          padding: var(--space-xs) 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .theme-editor__range {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--color-bone-dust);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .theme-editor__range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-ink);
          cursor: pointer;
          border: 2px solid var(--color-surface);
          box-shadow: var(--shadow-sm);
        }

        .theme-editor__range-value {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .theme-editor__actions {
          display: flex;
          gap: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--color-border-subtle);
        }

        .theme-editor__export {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: var(--space-sm);
          background: var(--color-surface-raised);
          border-radius: var(--radius-md);
        }

        .theme-editor__export-textarea {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ink);
          background: var(--color-bone);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          resize: vertical;
          outline: none;
          line-height: 1.5;
        }

        .theme-editor__export-textarea:focus {
          border-color: var(--color-accent);
        }

        .theme-editor__export-actions {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </Panel>
  );
};
