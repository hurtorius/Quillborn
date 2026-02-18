import { Component, Show } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";
import { themeStore } from "@/stores/theme";

export const WindowChrome: Component = () => {
  const { store } = manuscriptStore;

  return (
    <div class="window-chrome" data-tauri-drag-region>
      <div class="window-chrome__controls">
        <button class="window-chrome__btn window-chrome__btn--close" title="Close">
          <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 1L7 7M7 1L1 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="window-chrome__btn window-chrome__btn--minimize" title="Minimize">
          <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4H7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="window-chrome__btn window-chrome__btn--maximize" title="Maximize">
          <svg width="8" height="8" viewBox="0 0 8 8"><rect x="1" y="1" width="6" height="6" stroke="currentColor" stroke-width="1" fill="none" rx="0.5"/></svg>
        </button>
      </div>

      <div class="window-chrome__title" data-tauri-drag-region>
        <span class="window-chrome__app-name">Quillborn</span>
        <Show when={store.project}>
          <span class="window-chrome__separator">/</span>
          <span class="window-chrome__project-name">{store.project!.metadata.title}</span>
          <Show when={store.activeChapter}>
            <span class="window-chrome__separator">/</span>
            <span class="window-chrome__chapter-name">{store.activeChapter!.title}</span>
          </Show>
          <Show when={store.isDirty}>
            <span class="window-chrome__dirty-dot" />
          </Show>
        </Show>
      </div>

      <div class="window-chrome__actions">
        <button
          class="window-chrome__theme-toggle"
          onClick={() => themeStore.toggleTheme()}
          title={`Switch to ${themeStore.theme() === "classic" ? "Candlelight" : "Classic"} theme`}
        >
          <Show when={themeStore.theme() === "classic"} fallback={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M2.76 2.76L3.82 3.82M10.18 10.18L11.24 11.24M11.24 2.76L10.18 3.82M3.82 10.18L2.76 11.24" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
          }>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.5 8.5A5.5 5.5 0 015.5 1.5 5.5 5.5 0 1012.5 8.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </Show>
        </button>
      </div>

      <style>{`
        .window-chrome {
          display: flex;
          align-items: center;
          height: var(--chrome-height);
          background: var(--color-bone);
          border-bottom: 1px solid var(--color-border-subtle);
          padding: 0 var(--space-md);
          gap: var(--space-md);
          z-index: var(--z-chrome);
          flex-shrink: 0;
          -webkit-app-region: drag;
        }

        .window-chrome__controls {
          display: flex;
          gap: 8px;
          -webkit-app-region: no-drag;
        }

        .window-chrome__btn {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast);
          color: transparent;
        }

        .window-chrome__btn:hover {
          color: var(--color-ink);
        }

        .window-chrome__btn svg {
          width: 6px;
          height: 6px;
        }

        .window-chrome__btn--close {
          background: #FF5F57;
        }

        .window-chrome__btn--close:hover {
          background: #FF3B30;
        }

        .window-chrome__btn--minimize {
          background: #FEBC2E;
        }

        .window-chrome__btn--minimize:hover {
          background: #FFA500;
        }

        .window-chrome__btn--maximize {
          background: #28C840;
        }

        .window-chrome__btn--maximize:hover {
          background: #20A835;
        }

        .window-chrome__title {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--font-size-sm);
          color: var(--color-ghost);
          overflow: hidden;
          -webkit-app-region: drag;
        }

        .window-chrome__app-name {
          font-family: var(--font-display);
          font-weight: 600;
          color: var(--color-ink);
          letter-spacing: 0.02em;
        }

        .window-chrome__separator {
          color: var(--color-ghost);
          opacity: 0.4;
        }

        .window-chrome__project-name {
          color: var(--color-ink-wash);
        }

        .window-chrome__chapter-name {
          color: var(--color-ghost);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .window-chrome__dirty-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          flex-shrink: 0;
        }

        .window-chrome__actions {
          display: flex;
          gap: var(--space-xs);
          -webkit-app-region: no-drag;
        }

        .window-chrome__theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--color-ghost);
          transition: color var(--transition-fast), background var(--transition-fast);
        }

        .window-chrome__theme-toggle:hover {
          color: var(--color-ink);
          background: var(--color-bone-dust);
        }
      `}</style>
    </div>
  );
};
