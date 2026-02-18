import { Component, createMemo } from "solid-js";
import { writingStore } from "@/stores/writing";
import { manuscriptStore } from "@/stores/manuscript";

export const SessionProgress: Component = () => {
  const { store } = manuscriptStore;

  const progress = createMemo(() => {
    const target = writingStore.dailyTarget();
    const session = store.sessionWordCount;
    if (target <= 0) return 0;
    return Math.min(1, session / target);
  });

  return (
    <div class="session-progress" title={`${store.sessionWordCount} / ${writingStore.dailyTarget()} words today`}>
      <div class="session-progress__bar" style={{ width: `${progress() * 100}%` }} />

      <style>{`
        .session-progress {
          height: 3px;
          background: var(--color-border-subtle);
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .session-progress__bar {
          height: 100%;
          background: var(--color-accent);
          transition: width 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
          border-radius: 0 2px 2px 0;
        }
      `}</style>
    </div>
  );
};
