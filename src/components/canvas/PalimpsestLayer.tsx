import { Component, For } from "solid-js";
import { PalimpsestFragment, writingStore } from "@/stores/writing";
import { manuscriptStore } from "@/stores/manuscript";

interface PalimpsestLayerProps {
  fragments: PalimpsestFragment[];
}

export const PalimpsestLayer: Component<PalimpsestLayerProps> = (props) => {
  const handleRestore = (fragment: PalimpsestFragment) => {
    const { store, updateChapterContent } = manuscriptStore;
    if (!store.activeChapter) return;
    const content = store.activeChapter.content;
    const pos = Math.min(fragment.position, content.length);
    const newContent = content.substring(0, pos) + fragment.text + content.substring(pos);
    updateChapterContent(newContent);
    // Remove from palimpsest
    writingStore.clearPalimpsest();
  };

  return (
    <div class="palimpsest-layer">
      <For each={props.fragments}>
        {(fragment) => (
          <div
            class="palimpsest-fragment"
            style={{ top: `${Math.min(fragment.position / 10, 90)}%` }}
            onClick={() => handleRestore(fragment)}
            title="Click to restore this deleted text"
          >
            <span class="palimpsest-fragment__text">{fragment.text.substring(0, 80)}{fragment.text.length > 80 ? "\u2026" : ""}</span>
          </div>
        )}
      </For>

      <style>{`
        .palimpsest-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }
        .palimpsest-fragment {
          position: absolute;
          left: 0;
          right: 0;
          padding: 2px var(--space-sm);
          color: var(--color-ghost);
          font-family: var(--font-canvas);
          font-size: var(--font-size-sm);
          opacity: 0.25;
          font-style: italic;
          cursor: pointer;
          pointer-events: all;
          transition: opacity var(--transition-fast);
          text-decoration: line-through;
          text-decoration-color: rgba(200, 194, 186, 0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .palimpsest-fragment:hover {
          opacity: 0.7;
          background: var(--color-accent-muted);
          text-decoration: none;
        }
        .palimpsest-fragment__text {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
