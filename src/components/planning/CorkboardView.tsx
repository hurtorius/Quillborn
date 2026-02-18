import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { manuscriptStore, ManuscriptNode } from "@/stores/manuscript";
import { planningStore } from "@/stores/planning";

export const CorkboardView: Component = () => {
  const { store } = manuscriptStore;
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [dragging, setDragging] = createSignal<string | null>(null);
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });

  const chapters = createMemo(() => {
    if (!store.project) return [];
    return Object.values(store.project.structure.nodes).filter(
      (n) => n.node_type === "chapter"
    );
  });

  const getCardPosition = (chapter: ManuscriptNode, index: number) => {
    const card = planningStore.corkboardCards[chapter.id];
    if (card) return { x: card.x, y: card.y };
    const col = index % 4;
    const row = Math.floor(index / 4);
    return { x: 20 + col * 220, y: 20 + row * 200 };
  };

  const handleMouseDown = (id: string, e: MouseEvent) => {
    setDragging(id);
    const pos = getCardPosition(
      chapters().find((c) => c.id === id)!,
      chapters().findIndex((c) => c.id === id)
    );
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging()) return;
    const x = e.clientX - dragOffset().x;
    const y = e.clientY - dragOffset().y;
    planningStore.addCorkboardCard({
      id: dragging()!,
      chapterId: dragging()!,
      x, y,
      pinned: false,
      label: "",
      color: "",
    });
  };

  const handleMouseUp = () => setDragging(null);

  const moodColor = (mood?: string) => {
    const colors: Record<string, string> = {
      tension: "#8B4513", grief: "#4A5568", joy: "#D4A017",
      dread: "#2D1B2E", calm: "#6B8E6B", chaos: "#8B0000",
      romance: "#C4556A", mystery: "#2C3E50", action: "#CC5500",
      reflection: "#7B8D6F",
    };
    return mood ? colors[mood] || "transparent" : "transparent";
  };

  return (
    <div
      class="corkboard"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div class="corkboard__toolbar">
        <span class="corkboard__title">Corkboard</span>
        <div class="corkboard__zoom">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>-</button>
          <span>{Math.round(zoom() * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
        </div>
      </div>

      <div
        class="corkboard__canvas"
        style={{ transform: `scale(${zoom()}) translate(${panX()}px, ${panY()}px)` }}
      >
        <For each={chapters()}>
          {(chapter, index) => {
            const pos = () => getCardPosition(chapter, index());
            return (
              <div
                class={`corkboard__card ${dragging() === chapter.id ? "corkboard__card--dragging" : ""}`}
                style={{
                  left: `${pos().x}px`,
                  top: `${pos().y}px`,
                  "border-left-color": moodColor(chapter.mood || undefined),
                }}
                onMouseDown={(e) => handleMouseDown(chapter.id, e)}
              >
                <div class="corkboard__card-header">
                  <span class="corkboard__card-title truncate">{chapter.title}</span>
                  <span class={`status-stamp status-stamp--${chapter.status}`}>
                    {chapter.status}
                  </span>
                </div>
                <div class="corkboard__card-preview">
                  {/* First line preview would go here */}
                  <span class="corkboard__card-words">{chapter.word_count.toLocaleString()} words</span>
                </div>
                <Show when={chapter.mood}>
                  <div class="corkboard__card-mood" style={{ color: moodColor(chapter.mood || undefined) }}>
                    {chapter.mood}
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      <style>{`
        .corkboard {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-bone-dust);
          overflow: hidden;
          position: relative;
        }
        .corkboard__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
          background: var(--color-surface-raised);
          flex-shrink: 0;
        }
        .corkboard__title {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: 600;
        }
        .corkboard__zoom {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }
        .corkboard__zoom button {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
        }
        .corkboard__zoom button:hover { background: var(--color-bone-dust); }
        .corkboard__canvas {
          flex: 1;
          position: relative;
          overflow: auto;
          transform-origin: 0 0;
          min-height: 0;
        }
        .corkboard__card {
          position: absolute;
          width: 200px;
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-left: 3px solid var(--color-ghost);
          border-radius: var(--radius-md);
          padding: var(--space-sm) var(--space-md);
          box-shadow: var(--shadow-sm);
          cursor: grab;
          transition: box-shadow var(--transition-fast), transform var(--transition-fast);
          user-select: none;
        }
        .corkboard__card:hover { box-shadow: var(--shadow-md); }
        .corkboard__card--dragging {
          box-shadow: var(--shadow-lg);
          cursor: grabbing;
          z-index: 10;
          transform: rotate(-1deg);
        }
        .corkboard__card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-xs);
          margin-bottom: var(--space-xs);
        }
        .corkboard__card-title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-ink);
          flex: 1;
          min-width: 0;
        }
        .corkboard__card-preview {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }
        .corkboard__card-words {
          font-variant-numeric: tabular-nums;
        }
        .corkboard__card-mood {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: var(--space-xs);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
