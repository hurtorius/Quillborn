import { Component, For, Show, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { keybindingStore, Command } from "@/stores/keybindings";

export const CommandPalette: Component = () => {
  const { commands, paletteOpen, closePalette, executeCommand } = keybindingStore;
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    const all = commands();
    if (!q) return all;

    return all
      .map((cmd) => {
        const label = cmd.label.toLowerCase();
        const cat = cmd.category.toLowerCase();
        let score = 0;

        // Exact match in label
        if (label.includes(q)) {
          score += 10;
          if (label.startsWith(q)) score += 5;
        }
        // Match in category
        if (cat.includes(q)) score += 3;

        // Fuzzy matching
        if (score === 0) {
          let qi = 0;
          for (let i = 0; i < label.length && qi < q.length; i++) {
            if (label[i] === q[qi]) qi++;
          }
          if (qi === q.length) score += 1;
        }

        return { cmd, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd);
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = filtered();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (items[selectedIndex()]) {
          executeCommand(items[selectedIndex()].id);
          setQuery("");
        }
        break;
      case "Escape":
        e.preventDefault();
        closePalette();
        setQuery("");
        break;
    }
  };

  // Reset selection on query change
  createMemo(() => {
    query();
    setSelectedIndex(0);
  });

  // Focus input when palette opens
  createMemo(() => {
    if (paletteOpen() && inputRef) {
      setTimeout(() => inputRef!.focus(), 10);
    }
  });

  return (
    <Show when={paletteOpen()}>
      <Portal>
        <div class="command-palette-backdrop anim-fade-in" onClick={() => { closePalette(); setQuery(""); }}>
          <div class="command-palette anim-surface-below" onClick={(e) => e.stopPropagation()}>
            <div class="command-palette__input-row">
              <svg class="command-palette__search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/>
                <path d="M10 10L13 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              <input
                ref={inputRef}
                class="command-palette__input"
                type="text"
                placeholder="Type a command..."
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
              />
              <kbd class="command-palette__esc">ESC</kbd>
            </div>

            <Show when={filtered().length > 0}>
              <div class="command-palette__results">
                <For each={filtered()}>
                  {(cmd, index) => (
                    <button
                      class={`command-palette__item ${index() === selectedIndex() ? "command-palette__item--selected" : ""}`}
                      onClick={() => {
                        executeCommand(cmd.id);
                        setQuery("");
                      }}
                      onMouseEnter={() => setSelectedIndex(index())}
                    >
                      <span class="command-palette__item-category">{cmd.category}</span>
                      <span class="command-palette__item-label">{cmd.label}</span>
                      <Show when={cmd.keys}>
                        <kbd class="command-palette__item-keys">{cmd.keys}</kbd>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={query() && filtered().length === 0}>
              <div class="command-palette__empty">
                No matching commands
              </div>
            </Show>
          </div>
        </div>

        <style>{`
          .command-palette-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: center;
            padding-top: 15vh;
            z-index: var(--z-palette);
          }

          .command-palette {
            width: 560px;
            max-height: 400px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-overlay);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-self: flex-start;
          }

          .command-palette__input-row {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            border-bottom: 1px solid var(--color-border-subtle);
          }

          .command-palette__search-icon {
            color: var(--color-ghost);
            flex-shrink: 0;
          }

          .command-palette__input {
            flex: 1;
            font-size: var(--font-size-base);
            color: var(--color-ink);
            background: transparent;
            border: none;
            outline: none;
            font-family: var(--font-ui);
          }

          .command-palette__input::placeholder {
            color: var(--color-ghost);
          }

          .command-palette__esc {
            font-size: 10px;
            padding: 2px 6px;
            background: var(--color-bone-dust);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            color: var(--color-ghost);
            font-family: var(--font-ui);
          }

          .command-palette__results {
            overflow-y: auto;
            padding: var(--space-xs) 0;
          }

          .command-palette__item {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            width: 100%;
            padding: var(--space-sm) var(--space-md);
            text-align: left;
            font-size: var(--font-size-sm);
            color: var(--color-ink);
            transition: background var(--transition-fast);
          }

          .command-palette__item:hover,
          .command-palette__item--selected {
            background: var(--color-bone-dust);
          }

          .command-palette__item-category {
            font-size: var(--font-size-xs);
            color: var(--color-ghost);
            min-width: 72px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .command-palette__item-label {
            flex: 1;
          }

          .command-palette__item-keys {
            font-size: 10px;
            padding: 2px 6px;
            background: var(--color-bone-dust);
            border: 1px solid var(--color-border-subtle);
            border-radius: var(--radius-sm);
            color: var(--color-ghost);
            font-family: var(--font-ui);
          }

          .command-palette__empty {
            padding: var(--space-lg) var(--space-md);
            text-align: center;
            color: var(--color-ghost);
            font-size: var(--font-size-sm);
          }
        `}</style>
      </Portal>
    </Show>
  );
};
