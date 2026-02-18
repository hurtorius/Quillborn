import { Component, For, createMemo } from "solid-js";

interface ProseRhythmProps {
  sentences: string[];
}

export const ProseRhythm: Component<ProseRhythmProps> = (props) => {
  const bars = createMemo(() => {
    return props.sentences.map((sentence) => {
      const words = sentence.split(/\s+/).filter(Boolean).length;
      // Count clauses (approximate by commas, semicolons, dashes)
      const clauses = (sentence.match(/[,;:\u2014\u2013]/g) || []).length + 1;
      return { words, clauses, text: sentence };
    });
  });

  const maxWords = createMemo(() => {
    return Math.max(...bars().map((b) => b.words), 1);
  });

  return (
    <div class="prose-rhythm" title="Prose Rhythm Visualizer">
      <For each={bars()}>
        {(bar) => {
          const width = Math.max(2, (bar.words / maxWords()) * 24);
          const intensity = Math.min(1, bar.clauses / 4);
          return (
            <div
              class="prose-rhythm__bar"
              style={{
                width: `${width}px`,
                opacity: 0.3 + intensity * 0.7,
              }}
              title={`${bar.words} words, ${bar.clauses} clause${bar.clauses > 1 ? "s" : ""}`}
            />
          );
        }}
      </For>

      <style>{`
        .prose-rhythm {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 28px;
          min-width: 28px;
          padding-top: 4px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .prose-rhythm__bar {
          height: 3px;
          background: var(--color-ink);
          border-radius: 1px;
          min-width: 2px;
          transition: width var(--transition-base), opacity var(--transition-base);
          cursor: pointer;
        }
        .prose-rhythm__bar:hover {
          opacity: 1 !important;
          background: var(--color-accent);
        }
      `}</style>
    </div>
  );
};
