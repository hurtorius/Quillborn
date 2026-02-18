import { Component, For, createSignal, createMemo, onMount } from "solid-js";

interface DayData {
  date: string;
  words: number;
}

export const WritingHeatmap: Component = () => {
  const [data, setData] = createSignal<DayData[]>([]);

  onMount(() => {
    // Load heatmap data from localStorage
    const raw = localStorage.getItem("quillborn-heatmap");
    if (raw) {
      try { setData(JSON.parse(raw)); } catch { /* ignore */ }
    }
  });

  // Generate 365 days grid
  const grid = createMemo(() => {
    const today = new Date();
    const days: { date: string; words: number; level: number }[] = [];
    const dataMap = new Map(data().map((d) => [d.date, d.words]));

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const words = dataMap.get(dateStr) || 0;
      const level = words === 0 ? 0 : words < 250 ? 1 : words < 500 ? 2 : words < 1000 ? 3 : 4;
      days.push({ date: dateStr, words, level });
    }
    return days;
  });

  const weeks = createMemo(() => {
    const g = grid();
    const w: (typeof g)[] = [];
    for (let i = 0; i < g.length; i += 7) {
      w.push(g.slice(i, i + 7));
    }
    return w;
  });

  const currentStreak = createMemo(() => {
    const g = grid();
    let streak = 0;
    for (let i = g.length - 1; i >= 0; i--) {
      if (g[i].words > 0) streak++;
      else break;
    }
    return streak;
  });

  const totalDays = createMemo(() => grid().filter((d) => d.words > 0).length);

  const levelColor = (level: number) => {
    switch (level) {
      case 1: return "var(--color-ghost)";
      case 2: return "var(--color-status-draft)";
      case 3: return "var(--color-status-revised)";
      case 4: return "var(--color-ink)";
      default: return "var(--color-bone-dust)";
    }
  };

  return (
    <div class="heatmap">
      <div class="heatmap__header">
        <span class="heatmap__title">Writing Activity</span>
        <div class="heatmap__stats">
          <span class="heatmap__stat">{currentStreak()} day streak</span>
          <span class="heatmap__stat">{totalDays()} days active</span>
        </div>
      </div>
      <div class="heatmap__grid">
        <For each={weeks()}>
          {(week) => (
            <div class="heatmap__week">
              <For each={week}>
                {(day) => (
                  <div
                    class="heatmap__day"
                    style={{ background: levelColor(day.level) }}
                    title={`${day.date}: ${day.words} words`}
                  />
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <div class="heatmap__legend">
        <span>Less</span>
        <For each={[0, 1, 2, 3, 4]}>
          {(level) => <div class="heatmap__legend-box" style={{ background: levelColor(level) }} />}
        </For>
        <span>More</span>
      </div>

      <style>{`
        .heatmap {
          padding: var(--space-md);
        }
        .heatmap__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
        }
        .heatmap__title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-ink);
        }
        .heatmap__stats { display: flex; gap: var(--space-md); }
        .heatmap__stat {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }
        .heatmap__grid {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          padding-bottom: var(--space-sm);
        }
        .heatmap__week {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .heatmap__day {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          transition: background var(--transition-fast);
        }
        .heatmap__day:hover { outline: 1px solid var(--color-ink); outline-offset: 1px; }
        .heatmap__legend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: var(--color-ghost);
          margin-top: var(--space-sm);
          justify-content: flex-end;
        }
        .heatmap__legend-box {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

// Helper to record daily words (call from App)
export function recordDailyWords(words: number) {
  const today = new Date().toISOString().split("T")[0];
  const raw = localStorage.getItem("quillborn-heatmap");
  let data: DayData[] = [];
  if (raw) { try { data = JSON.parse(raw); } catch { /* ignore */ } }

  const existing = data.find((d) => d.date === today);
  if (existing) existing.words = Math.max(existing.words, words);
  else data.push({ date: today, words });

  // Keep only last 365 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  data = data.filter((d) => new Date(d.date) >= cutoff);

  localStorage.setItem("quillborn-heatmap", JSON.stringify(data));
}

interface DayData {
  date: string;
  words: number;
}
