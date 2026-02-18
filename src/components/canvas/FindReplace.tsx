import { Component, Show, createEffect, createMemo } from "solid-js";
import { writingStore } from "@/stores/writing";
import { manuscriptStore } from "@/stores/manuscript";

export const FindReplace: Component = () => {
  let findInputRef: HTMLInputElement | undefined;
  const { store, updateChapterContent } = manuscriptStore;

  createEffect(() => {
    if (writingStore.findReplaceOpen() && findInputRef) {
      findInputRef.focus();
    }
  });

  const matches = createMemo(() => {
    const query = writingStore.findQuery();
    const content = store.activeChapter?.content || "";
    if (!query || !content) return [];

    try {
      const flags = writingStore.findCaseSensitive() ? "g" : "gi";
      const pattern = writingStore.findRegex() ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, flags);
      const results: { index: number; length: number }[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        results.push({ index: match.index, length: match[0].length });
        if (results.length > 10000) break;
      }
      return results;
    } catch {
      return [];
    }
  });

  createEffect(() => {
    writingStore.setFindMatchCount(matches().length);
  });

  const handleFindNext = () => {
    const idx = writingStore.findCurrentIndex();
    if (matches().length > 0) {
      writingStore.setFindCurrentIndex((idx + 1) % matches().length);
    }
  };

  const handleFindPrev = () => {
    const idx = writingStore.findCurrentIndex();
    if (matches().length > 0) {
      writingStore.setFindCurrentIndex((idx - 1 + matches().length) % matches().length);
    }
  };

  const handleReplace = () => {
    const m = matches();
    const idx = writingStore.findCurrentIndex();
    if (idx >= m.length || !store.activeChapter) return;
    const match = m[idx];
    const content = store.activeChapter.content;
    const newContent = content.substring(0, match.index) + writingStore.replaceQuery() + content.substring(match.index + match.length);
    updateChapterContent(newContent);
  };

  const handleReplaceAll = () => {
    const content = store.activeChapter?.content || "";
    const query = writingStore.findQuery();
    if (!query || !content) return;
    try {
      const flags = writingStore.findCaseSensitive() ? "g" : "gi";
      const pattern = writingStore.findRegex() ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, flags);
      const newContent = content.replace(regex, writingStore.replaceQuery());
      updateChapterContent(newContent);
    } catch {
      // Invalid regex
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      writingStore.toggleFindReplace();
    } else if (e.key === "Enter") {
      if (e.shiftKey) handleFindPrev();
      else handleFindNext();
    }
  };

  return (
    <div class="find-replace anim-surface-below">
      <div class="find-replace__row">
        <div class="find-replace__input-group">
          <input
            ref={findInputRef}
            class="find-replace__input"
            type="text"
            placeholder="Find..."
            value={writingStore.findQuery()}
            onInput={(e) => writingStore.setFindQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <span class="find-replace__count">
            {matches().length > 0
              ? `${writingStore.findCurrentIndex() + 1}/${matches().length}`
              : writingStore.findQuery() ? "0 results" : ""}
          </span>
        </div>
        <button class={`find-replace__toggle ${writingStore.findRegex() ? "find-replace__toggle--active" : ""}`} onClick={() => writingStore.setFindRegex(!writingStore.findRegex())} title="Regular expression">.*</button>
        <button class={`find-replace__toggle ${writingStore.findCaseSensitive() ? "find-replace__toggle--active" : ""}`} onClick={() => writingStore.setFindCaseSensitive(!writingStore.findCaseSensitive())} title="Case sensitive">Aa</button>
        <button class="find-replace__btn" onClick={handleFindPrev} title="Previous">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M9 8L6 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="find-replace__btn" onClick={handleFindNext} title="Next">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 4L6 7L9 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="find-replace__btn" onClick={() => writingStore.toggleFindReplace()} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="find-replace__row">
        <div class="find-replace__input-group">
          <input
            class="find-replace__input"
            type="text"
            placeholder="Replace..."
            value={writingStore.replaceQuery()}
            onInput={(e) => writingStore.setReplaceQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button class="find-replace__btn-text" onClick={handleReplace}>Replace</button>
        <button class="find-replace__btn-text" onClick={handleReplaceAll}>All</button>
      </div>

      <style>{`
        .find-replace {
          position: absolute;
          top: 0;
          right: var(--space-xl);
          z-index: 100;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          box-shadow: var(--shadow-md);
          padding: var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 360px;
        }
        .find-replace__row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .find-replace__input-group {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--color-bone);
          border-radius: var(--radius-sm);
          padding: 0 var(--space-sm);
        }
        .find-replace__input {
          flex: 1;
          font-size: var(--font-size-sm);
          padding: 5px 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--color-ink);
          font-family: var(--font-ui);
        }
        .find-replace__input::placeholder { color: var(--color-ghost); }
        .find-replace__count {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .find-replace__toggle, .find-replace__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          color: var(--color-ghost);
          font-size: var(--font-size-xs);
          font-family: var(--font-mono);
          transition: all var(--transition-fast);
        }
        .find-replace__toggle:hover, .find-replace__btn:hover {
          background: var(--color-bone-dust);
          color: var(--color-ink);
        }
        .find-replace__toggle--active {
          background: var(--color-accent-muted);
          color: var(--color-accent);
        }
        .find-replace__btn-text {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        .find-replace__btn-text:hover {
          background: var(--color-bone-dust);
          color: var(--color-ink);
        }
      `}</style>
    </div>
  );
};
