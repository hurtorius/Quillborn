import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { planningStore, TimelineEvent } from "@/stores/planning";
import { Button } from "@/components/ui/Button";

export const TimelineView: Component = () => {
  const [zoomLevel, setZoomLevel] = createSignal<"scene" | "chapter" | "act">("chapter");
  const [filterThread, setFilterThread] = createSignal<string | null>(null);

  const events = createMemo(() => {
    let all = Object.values(planningStore.timelineEvents);
    if (filterThread()) all = all.filter((e) => e.plotThread === filterThread());
    return all.sort((a, b) => a.position - b.position);
  });

  const threads = createMemo(() => Object.values(planningStore.plotThreads));
  const maxTrack = createMemo(() => Math.max(0, ...events().map((e) => e.track)));

  const handleAdd = () => {
    const id = crypto.randomUUID();
    const maxPos = Math.max(0, ...events().map((e) => e.position));
    planningStore.addTimelineEvent({
      id, title: "New Event", description: "", plotThread: "",
      linkedChapters: [], position: maxPos + 100, track: 0, color: "var(--color-ghost)",
    });
  };

  return (
    <div class="timeline-view">
      <div class="timeline-view__toolbar">
        <span class="timeline-view__title">Timeline</span>
        <div class="timeline-view__zoom-controls">
          <For each={["scene", "chapter", "act"] as const}>
            {(level) => (
              <button class={`timeline-view__zoom-btn ${zoomLevel() === level ? "timeline-view__zoom-btn--active" : ""}`} onClick={() => setZoomLevel(level)}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            )}
          </For>
        </div>
        <Show when={threads().length > 0}>
          <select class="timeline-view__thread-filter" value={filterThread() || ""} onChange={(e) => setFilterThread(e.currentTarget.value || null)}>
            <option value="">All threads</option>
            <For each={threads()}>{(t) => <option value={t.id}>{t.name}</option>}</For>
          </select>
        </Show>
        <Button size="sm" variant="ghost" onClick={handleAdd}>+ Event</Button>
      </div>

      <div class="timeline-view__scroll">
        <div class="timeline-view__track-area" style={{ height: `${(maxTrack() + 1) * 80 + 60}px` }}>
          {/* Horizontal time axis */}
          <div class="timeline-view__axis" />

          <For each={events()}>
            {(event) => {
              const scale = zoomLevel() === "scene" ? 2 : zoomLevel() === "act" ? 0.5 : 1;
              return (
                <div
                  class="timeline-view__event"
                  style={{
                    left: `${event.position * scale}px`,
                    top: `${40 + event.track * 80}px`,
                    "border-left-color": event.color,
                  }}
                >
                  <div class="timeline-view__event-title">{event.title}</div>
                  <Show when={event.description}>
                    <div class="timeline-view__event-desc">{event.description}</div>
                  </Show>
                  <Show when={event.plotThread}>
                    <div class="timeline-view__event-thread" style={{ color: event.color }}>{event.plotThread}</div>
                  </Show>
                </div>
              );
            }}
          </For>

          <Show when={events().length === 0}>
            <div class="timeline-view__empty">
              No timeline events yet. Add events to visualize your story's progression.
            </div>
          </Show>
        </div>
      </div>

      <style>{`
        .timeline-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-raised);
          overflow: hidden;
        }
        .timeline-view__toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
          flex-shrink: 0;
        }
        .timeline-view__title {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: 600;
        }
        .timeline-view__zoom-controls {
          display: flex;
          gap: 2px;
          background: var(--color-bone);
          border-radius: var(--radius-sm);
          padding: 2px;
        }
        .timeline-view__zoom-btn {
          font-size: var(--font-size-xs);
          padding: 3px 8px;
          border-radius: 2px;
          color: var(--color-ghost);
          transition: all var(--transition-fast);
        }
        .timeline-view__zoom-btn:hover { color: var(--color-ink); }
        .timeline-view__zoom-btn--active { background: var(--color-surface); color: var(--color-ink); box-shadow: var(--shadow-sm); }
        .timeline-view__thread-filter {
          font-size: var(--font-size-xs);
          padding: 3px var(--space-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: var(--font-ui);
        }
        .timeline-view__scroll {
          flex: 1;
          overflow: auto;
          padding: var(--space-md);
        }
        .timeline-view__track-area {
          position: relative;
          min-width: 100%;
          min-height: 200px;
        }
        .timeline-view__axis {
          position: absolute;
          top: 30px;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-ghost) 5%, var(--color-ghost) 95%, transparent);
        }
        .timeline-view__event {
          position: absolute;
          width: 160px;
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-left: 3px solid var(--color-ghost);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          cursor: pointer;
          transition: box-shadow var(--transition-fast);
        }
        .timeline-view__event:hover { box-shadow: var(--shadow-md); }
        .timeline-view__event-title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-ink);
          margin-bottom: 2px;
        }
        .timeline-view__event-desc {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .timeline-view__event-thread {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 4px;
          font-weight: 600;
        }
        .timeline-view__empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-ghost);
          font-size: var(--font-size-sm);
        }
      `}</style>
    </div>
  );
};
