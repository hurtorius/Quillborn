import { Component, For, Show, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";

export const LivingManuscript: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [rotationY, setRotationY] = createSignal(-15);
  const [rotationX, setRotationX] = createSignal(5);
  const { store } = manuscriptStore;

  let animationFrame: number | undefined;
  let time = 0;

  const title = createMemo(() => store.project?.metadata.title || "Untitled Manuscript");
  const author = createMemo(() => store.project?.metadata.author || "Unknown Author");

  const chapters = createMemo(() => {
    if (!store.project) return [];
    const nodes = store.project.structure.nodes;
    const order = store.project.structure.order;
    return order
      .map((id) => nodes[id])
      .filter((n) => n && n.node_type === "chapter")
      .map((n) => ({
        id: n.id,
        title: n.title,
        wordCount: n.word_count,
        status: n.status,
      }));
  });

  const totalWords = createMemo(() =>
    chapters().reduce((sum, ch) => sum + ch.wordCount, 0)
  );

  const maxChapterWords = createMemo(() =>
    Math.max(1, ...chapters().map((ch) => ch.wordCount))
  );

  const animate = () => {
    if (!isOpen()) {
      time += 0.008;
      setRotationY(-15 + Math.sin(time) * 3);
      setRotationX(5 + Math.cos(time * 0.7) * 1.5);
    }
    animationFrame = requestAnimationFrame(animate);
  };

  onMount(() => {
    animate();
  });

  onCleanup(() => {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
    }
  });

  const handleClick = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen()) {
      setRotationY(-15);
      setRotationX(5);
    } else {
      setRotationY(-160);
      setRotationX(2);
    }
  };

  const pageThickness = (wordCount: number): number => {
    const ratio = wordCount / maxChapterWords();
    return Math.max(2, Math.round(ratio * 8));
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case "draft": return "var(--color-status-draft)";
      case "revised": return "var(--color-status-revised)";
      case "final": return "var(--color-status-final)";
      case "trash": return "var(--color-status-trash)";
      default: return "var(--color-ghost)";
    }
  };

  return (
    <div class="living-manuscript">
      <div class="living-manuscript__scene">
        <div
          class={`living-manuscript__book ${isOpen() ? "living-manuscript__book--open" : ""}`}
          style={{
            transform: `rotateY(${rotationY()}deg) rotateX(${rotationX()}deg)`,
          }}
          onClick={handleClick}
        >
          {/* Front Cover */}
          <div class="living-manuscript__cover living-manuscript__cover--front">
            <div class="living-manuscript__cover-inner">
              <div class="living-manuscript__cover-ornament">* * *</div>
              <h2 class="living-manuscript__cover-title">{title()}</h2>
              <div class="living-manuscript__cover-rule" />
              <p class="living-manuscript__cover-author">{author()}</p>
              <div class="living-manuscript__cover-footer">
                <span>{chapters().length} chapters</span>
                <span>{totalWords().toLocaleString()} words</span>
              </div>
            </div>
          </div>

          {/* Spine */}
          <div class="living-manuscript__spine">
            <span class="living-manuscript__spine-title">{title()}</span>
            <span class="living-manuscript__spine-author">{author()}</span>
          </div>

          {/* Pages */}
          <div class="living-manuscript__pages">
            <For each={chapters().slice(0, 20)}>
              {(chapter, i) => (
                <div
                  class="living-manuscript__page"
                  style={{
                    height: `${pageThickness(chapter.wordCount)}px`,
                    "background-color": "var(--color-bone)",
                    "border-left": `2px solid ${statusColor(chapter.status)}`,
                    transform: `translateZ(${i() * -1}px)`,
                  }}
                  title={`${chapter.title} (${chapter.wordCount} words)`}
                />
              )}
            </For>
          </div>

          {/* Back Cover */}
          <div class="living-manuscript__cover living-manuscript__cover--back">
            <div class="living-manuscript__cover-inner living-manuscript__cover-inner--back">
              <p class="living-manuscript__cover-blurb">
                A manuscript of {chapters().length} chapters
              </p>
              <Show when={totalWords() > 0}>
                <p class="living-manuscript__cover-wordcount">
                  {totalWords().toLocaleString()} words
                </p>
              </Show>
            </div>
          </div>

          {/* Top edge */}
          <div class="living-manuscript__edge living-manuscript__edge--top" />

          {/* Bottom edge */}
          <div class="living-manuscript__edge living-manuscript__edge--bottom" />

          {/* Right edge (page block) */}
          <div class="living-manuscript__edge living-manuscript__edge--right" />
        </div>
      </div>

      <div class="living-manuscript__info">
        <p class="living-manuscript__hint">
          {isOpen() ? "Click to close" : "Click to open"}
        </p>
      </div>

      <style>{`
        .living-manuscript {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
          padding: var(--space-xl);
          user-select: none;
        }

        .living-manuscript__scene {
          perspective: 1200px;
          perspective-origin: 50% 50%;
          width: 300px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .living-manuscript__book {
          position: relative;
          width: 200px;
          height: 280px;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }

        .living-manuscript__book:hover {
          filter: brightness(1.02);
        }

        /* Front Cover */
        .living-manuscript__cover {
          position: absolute;
          width: 200px;
          height: 280px;
          border-radius: 2px 8px 8px 2px;
          backface-visibility: hidden;
        }

        .living-manuscript__cover--front {
          background: linear-gradient(135deg, #2A1810 0%, #3D2A1E 50%, #2A1810 100%);
          transform: translateZ(16px);
          box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(139, 26, 26, 0.3);
        }

        .living-manuscript__cover--back {
          background: linear-gradient(135deg, #2A1810 0%, #3D2A1E 50%, #2A1810 100%);
          transform: translateZ(-16px) rotateY(180deg);
          border: 1px solid rgba(100, 80, 60, 0.3);
        }

        .living-manuscript__cover-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: var(--space-xl) var(--space-lg);
          text-align: center;
          gap: var(--space-md);
        }

        .living-manuscript__cover-inner--back {
          justify-content: flex-end;
          padding-bottom: var(--space-xl);
        }

        .living-manuscript__cover-ornament {
          font-size: var(--font-size-sm);
          color: rgba(196, 85, 58, 0.6);
          letter-spacing: 0.3em;
        }

        .living-manuscript__cover-title {
          font-family: var(--font-display);
          font-size: var(--font-size-xl);
          font-weight: 600;
          color: #E8DCC8;
          line-height: 1.3;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
          max-height: 80px;
          overflow: hidden;
        }

        .living-manuscript__cover-rule {
          width: 60px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(196, 85, 58, 0.5), transparent);
        }

        .living-manuscript__cover-author {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: rgba(232, 220, 200, 0.7);
          letter-spacing: 0.05em;
        }

        .living-manuscript__cover-footer {
          position: absolute;
          bottom: var(--space-md);
          display: flex;
          gap: var(--space-md);
          font-size: var(--font-size-xs);
          color: rgba(232, 220, 200, 0.4);
          font-family: var(--font-mono);
        }

        .living-manuscript__cover-blurb {
          font-size: var(--font-size-xs);
          color: rgba(232, 220, 200, 0.5);
          font-style: italic;
        }

        .living-manuscript__cover-wordcount {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: rgba(232, 220, 200, 0.3);
        }

        /* Spine */
        .living-manuscript__spine {
          position: absolute;
          width: 32px;
          height: 280px;
          left: -16px;
          background: linear-gradient(90deg, #1E120D, #2A1810, #1E120D);
          transform: rotateY(-90deg) translateZ(0px);
          transform-origin: left center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-lg);
          border-top: 1px solid rgba(100, 80, 60, 0.2);
          border-bottom: 1px solid rgba(100, 80, 60, 0.2);
        }

        .living-manuscript__spine-title {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: var(--font-display);
          font-size: var(--font-size-xs);
          color: #E8DCC8;
          letter-spacing: 0.05em;
          max-height: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .living-manuscript__spine-author {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-family: var(--font-ui);
          font-size: 9px;
          color: rgba(232, 220, 200, 0.5);
          max-height: 80px;
          overflow: hidden;
        }

        /* Pages (stacked along Z axis between covers) */
        .living-manuscript__pages {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 192px;
          display: flex;
          flex-direction: column;
          transform-style: preserve-3d;
        }

        .living-manuscript__page {
          width: 100%;
          border-radius: 0 1px 1px 0;
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }

        /* Edges */
        .living-manuscript__edge {
          position: absolute;
          background: linear-gradient(
            180deg,
            #F5F0EB 0%,
            #E8E3DC 20%,
            #F5F0EB 40%,
            #E8E3DC 60%,
            #F5F0EB 80%,
            #E8E3DC 100%
          );
        }

        .living-manuscript__edge--top {
          width: 200px;
          height: 32px;
          top: -16px;
          transform: rotateX(90deg) translateZ(0px);
          transform-origin: bottom center;
          border-radius: 2px;
        }

        .living-manuscript__edge--bottom {
          width: 200px;
          height: 32px;
          bottom: -16px;
          transform: rotateX(-90deg) translateZ(0px);
          transform-origin: top center;
          border-radius: 2px;
        }

        .living-manuscript__edge--right {
          width: 32px;
          height: 280px;
          right: -16px;
          transform: rotateY(90deg) translateZ(0px);
          transform-origin: left center;
          background: linear-gradient(
            0deg,
            #E8E3DC 0%,
            #F5F0EB 5%,
            #E8E3DC 10%,
            #F5F0EB 15%,
            #E8E3DC 20%,
            #F5F0EB 30%,
            #E8E3DC 40%,
            #F5F0EB 50%,
            #E8E3DC 60%,
            #F5F0EB 70%,
            #E8E3DC 80%,
            #F5F0EB 90%,
            #E8E3DC 100%
          );
          border-radius: 0 2px 2px 0;
        }

        /* Open state */
        .living-manuscript__book--open .living-manuscript__cover--front {
          transform: translateZ(16px) rotateY(-160deg);
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .living-manuscript__info {
          text-align: center;
        }

        .living-manuscript__hint {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
