import { Component, Show, createSignal } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";
import { writingStore } from "@/stores/writing";
import { Panel } from "@/components/ui/Panel";
import { GhostNotesPanel } from "@/components/planning/GhostNotes";
import { SoundPanel } from "@/components/sounds/SoundSystem";
import { WritingHeatmap } from "@/components/settings/WritingHeatmap";

export const ContextPanel: Component = () => {
  const { store } = manuscriptStore;
  const [statsCollapsed, setStatsCollapsed] = createSignal(false);
  const [notesCollapsed, setNotesCollapsed] = createSignal(true);
  const [ghostCollapsed, setGhostCollapsed] = createSignal(false);
  const [soundCollapsed, setSoundCollapsed] = createSignal(true);
  const [heatmapCollapsed, setHeatmapCollapsed] = createSignal(true);

  const readabilityScore = () => {
    const content = store.activeChapter?.content || "";
    const words = content.split(/\s+/).filter(Boolean).length;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim()).length;
    if (sentences === 0 || words === 0) return 0;
    const avgWordsPerSentence = words / sentences;
    // Simple Flesch-like readability (simplified)
    const score = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));
    return Math.round(score);
  };

  const dialogueRatio = () => {
    const content = store.activeChapter?.content || "";
    if (!content) return 0;
    const dialogueMatches = content.match(/[""\u201C\u201D].+?[""\u201C\u201D]/g) || [];
    const dialogueWords = dialogueMatches.join(" ").split(/\s+/).length;
    const totalWords = content.split(/\s+/).filter(Boolean).length;
    if (totalWords === 0) return 0;
    return Math.round((dialogueWords / totalWords) * 100);
  };

  const avgSentenceLength = () => {
    const content = store.activeChapter?.content || "";
    const words = content.split(/\s+/).filter(Boolean).length;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim()).length;
    if (sentences === 0) return 0;
    return Math.round(words / sentences);
  };

  return (
    <Show when={store.contextPanelOpen}>
      <aside class="context-panel anim-slide-right">
        <Panel
          title="Chapter Statistics"
          collapsible
          collapsed={statsCollapsed()}
          onToggle={() => setStatsCollapsed(!statsCollapsed())}
        >
          <Show when={store.activeChapter}>
            <div class="context-stats">
              <div class="context-stats__row">
                <span class="context-stats__label">Words</span>
                <span class="context-stats__value">{store.activeChapter!.word_count.toLocaleString()}</span>
              </div>
              <div class="context-stats__row">
                <span class="context-stats__label">Readability</span>
                <span class="context-stats__value">{readabilityScore()}/100</span>
              </div>
              <div class="context-stats__row">
                <span class="context-stats__label">Avg sentence</span>
                <span class="context-stats__value">{avgSentenceLength()} words</span>
              </div>
              <div class="context-stats__row">
                <span class="context-stats__label">Dialogue ratio</span>
                <span class="context-stats__value">{dialogueRatio()}%</span>
              </div>
              <Show when={store.activeChapter!.mood}>
                <div class="context-stats__row">
                  <span class="context-stats__label">Mood</span>
                  <span class="context-stats__value">{store.activeChapter!.mood}</span>
                </div>
              </Show>
            </div>
          </Show>
        </Panel>

        <Panel
          title="Notes"
          collapsible
          collapsed={notesCollapsed()}
          onToggle={() => setNotesCollapsed(!notesCollapsed())}
        >
          <div class="context-notes">
            <textarea
              class="context-notes__textarea"
              placeholder="Scratch notes for this chapter..."
              rows={5}
            />
          </div>
        </Panel>

        <Show when={store.activeChapterId}>
          <Panel
            title="Ghost Notes"
            collapsible
            collapsed={ghostCollapsed()}
            onToggle={() => setGhostCollapsed(!ghostCollapsed())}
          >
            <GhostNotesPanel />
          </Panel>
        </Show>

        <Panel
          title="Sound"
          collapsible
          collapsed={soundCollapsed()}
          onToggle={() => setSoundCollapsed(!soundCollapsed())}
        >
          <SoundPanel />
        </Panel>

        <Panel
          title="Writing Activity"
          collapsible
          collapsed={heatmapCollapsed()}
          onToggle={() => setHeatmapCollapsed(!heatmapCollapsed())}
        >
          <WritingHeatmap />
        </Panel>

        <style>{`
          .context-panel {
            width: var(--context-panel-width);
            min-width: var(--context-panel-width);
            height: 100%;
            background: var(--color-surface-raised);
            border-left: 1px solid var(--color-border-subtle);
            overflow-y: auto;
            z-index: var(--z-context);
          }
          .context-stats {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .context-stats__row {
            display: flex;
            justify-content: space-between;
            font-size: var(--font-size-xs);
          }
          .context-stats__label { color: var(--color-ghost); }
          .context-stats__value { color: var(--color-ink); font-variant-numeric: tabular-nums; }
          .context-notes__textarea {
            width: 100%;
            font-family: var(--font-ui);
            font-size: var(--font-size-sm);
            color: var(--color-ink);
            background: var(--color-bone);
            border: none;
            border-radius: var(--radius-sm);
            padding: var(--space-sm);
            resize: vertical;
            outline: none;
            min-height: 80px;
          }
          .context-notes__textarea:focus { box-shadow: 0 0 0 1px var(--color-accent); }
          .context-notes__textarea::placeholder { color: var(--color-ghost); }
        `}</style>
      </aside>
    </Show>
  );
};
