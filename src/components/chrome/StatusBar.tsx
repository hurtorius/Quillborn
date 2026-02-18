import { Component, Show, createMemo } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";

export const StatusBar: Component = () => {
  const { store } = manuscriptStore;

  const wordCountDisplay = createMemo(() => {
    if (store.activeChapter) {
      return store.activeChapter.word_count.toLocaleString();
    }
    return "0";
  });

  const totalWordCount = createMemo(() => {
    if (store.project) {
      return store.project.total_word_count.toLocaleString();
    }
    return "0";
  });

  const sessionWords = createMemo(() => {
    return store.sessionWordCount.toLocaleString();
  });

  const statusText = createMemo(() => {
    if (store.activeChapter) {
      return store.activeChapter.status.charAt(0).toUpperCase() + store.activeChapter.status.slice(1);
    }
    return "";
  });

  return (
    <div class="status-bar">
      <div class="status-bar__left">
        <Show when={store.activeChapter}>
          <span class={`status-bar__stamp status-stamp status-stamp--${store.activeChapter!.status}`}>
            {statusText()}
          </span>
        </Show>
        <Show when={store.isDirty}>
          <span class="status-bar__save-indicator" title="Unsaved changes">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2C6 2 4 6 4 8C4 9.1 4.9 10 6 10C7.1 10 8 9.1 8 8C8 6 6 2 6 2Z" fill="currentColor" opacity="0.6"/>
            </svg>
          </span>
        </Show>
      </div>

      <div class="status-bar__center">
        <Show when={store.project}>
          <span class="status-bar__total">
            {totalWordCount()} total
          </span>
        </Show>
      </div>

      <div class="status-bar__right">
        <Show when={store.sessionWordCount > 0}>
          <span class="status-bar__session">+{sessionWords()} session</span>
        </Show>
        <Show when={store.activeChapter}>
          <span class="status-bar__word-count">{wordCountDisplay()} words</span>
        </Show>
      </div>

      <style>{`
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--status-bar-height);
          padding: 0 var(--space-md);
          background: var(--color-bone);
          border-top: 1px solid var(--color-border-subtle);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          flex-shrink: 0;
          z-index: var(--z-chrome);
        }

        .status-bar__left,
        .status-bar__center,
        .status-bar__right {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .status-bar__left {
          flex: 1;
        }

        .status-bar__right {
          flex: 1;
          justify-content: flex-end;
        }

        .status-bar__save-indicator {
          display: flex;
          align-items: center;
          color: var(--color-accent);
          animation: quill-dip 800ms ease;
        }

        .status-bar__word-count {
          font-variant-numeric: tabular-nums;
        }

        .status-bar__session {
          color: var(--color-status-revised);
          font-variant-numeric: tabular-nums;
        }

        .status-bar__total {
          font-variant-numeric: tabular-nums;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};
