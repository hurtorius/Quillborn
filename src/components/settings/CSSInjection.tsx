import { Component, createSignal, onMount } from "solid-js";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const STORAGE_KEY = "quillborn-custom-css";
const STYLE_ELEMENT_ID = "quillborn-custom-css";

const injectCSS = (css: string) => {
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
};

export const CSSInjection: Component = () => {
  const [css, setCss] = createSignal("");
  const [applied, setApplied] = createSignal(false);

  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCss(saved);
      injectCSS(saved);
      setApplied(true);
    }
  });

  const handleApply = () => {
    const value = css();
    injectCSS(value);
    localStorage.setItem(STORAGE_KEY, value);
    setApplied(true);
  };

  const handleClear = () => {
    setCss("");
    injectCSS("");
    localStorage.removeItem(STORAGE_KEY);
    setApplied(false);
  };

  const charCount = () => css().length;

  return (
    <Panel title="Custom CSS">
      <div class="css-injection">
        <p class="css-injection__description">
          Inject custom CSS to override any styles. Changes take effect when you click Apply.
        </p>
        <div class="css-injection__editor-wrapper">
          <textarea
            class="css-injection__textarea"
            value={css()}
            onInput={(e) => {
              setCss(e.currentTarget.value);
              setApplied(false);
            }}
            placeholder={`/* Custom CSS */\n.my-class {\n  color: red;\n}`}
            spellcheck={false}
          />
          <div class="css-injection__footer">
            <span class="css-injection__char-count">
              {charCount()} character{charCount() !== 1 ? "s" : ""}
            </span>
            {applied() && (
              <span class="css-injection__status">Applied</span>
            )}
          </div>
        </div>
        <div class="css-injection__actions">
          <Button variant="primary" size="sm" onClick={handleApply}>
            Apply
          </Button>
          <Button variant="danger" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      <style>{`
        .css-injection {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding: var(--space-md) 0;
        }

        .css-injection__description {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          line-height: 1.5;
        }

        .css-injection__editor-wrapper {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .css-injection__textarea {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ink);
          background: var(--color-bone);
          border: none;
          padding: var(--space-md);
          resize: vertical;
          min-height: 200px;
          outline: none;
          line-height: 1.6;
          tab-size: 2;
        }

        .css-injection__textarea::placeholder {
          color: var(--color-ghost);
        }

        .css-injection__textarea:focus {
          box-shadow: inset 0 0 0 1px var(--color-accent);
        }

        .css-injection__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-xs) var(--space-md);
          background: var(--color-surface-raised);
          border-top: 1px solid var(--color-border-subtle);
        }

        .css-injection__char-count {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .css-injection__status {
          font-size: var(--font-size-xs);
          color: var(--color-status-revised);
          font-weight: 500;
        }

        .css-injection__actions {
          display: flex;
          gap: var(--space-sm);
        }
      `}</style>
    </Panel>
  );
};
