import { Component, createMemo } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";

export const ManuscriptHeartbeat: Component = () => {
  const { store } = manuscriptStore;

  const metrics = createMemo(() => {
    if (!store.project) return null;
    const nodes = Object.values(store.project.structure.nodes);
    const chapters = nodes.filter((n) => n.node_type === "chapter");
    const totalChapters = chapters.length;
    if (totalChapters === 0) return null;

    const statusCounts = { draft: 0, revised: 0, final: 0, trash: 0 };
    let totalWords = 0;
    const orphans: string[] = [];

    for (const ch of chapters) {
      statusCounts[ch.status as keyof typeof statusCounts]++;
      totalWords += ch.word_count;
      // Orphan: chapter with very few words
      if (ch.word_count < 50 && ch.status !== "trash") {
        orphans.push(ch.title);
      }
    }

    const completionPct = totalChapters > 0
      ? Math.round(((statusCounts.revised + statusCounts.final) / totalChapters) * 100)
      : 0;

    // Estimated reading time (250 wpm)
    const readingMinutes = Math.round(totalWords / 250);

    // Health score: 0-100
    const health = Math.min(100, Math.max(0,
      completionPct * 0.5 +
      (orphans.length === 0 ? 20 : Math.max(0, 20 - orphans.length * 5)) +
      (totalWords > 1000 ? 15 : totalWords / 1000 * 15) +
      15 // Base
    ));

    return {
      totalChapters,
      totalWords,
      statusCounts,
      completionPct,
      readingMinutes,
      orphans,
      health: Math.round(health),
    };
  });

  // Generate EKG-style path
  const ekg = createMemo(() => {
    const m = metrics();
    if (!m) return "M0,15 L100,15";
    const health = m.health / 100;
    const points: string[] = [];
    for (let i = 0; i <= 100; i += 2) {
      let y = 15;
      // Regular heartbeat rhythm
      const t = (i / 100) * Math.PI * 6;
      const beat = Math.sin(t) * (health * 8);
      // Irregularities for orphans
      const irregularity = m.orphans.length > 0 && (i % 30 < 4) ? Math.random() * 6 - 3 : 0;
      y = 15 - beat + irregularity;
      points.push(`${i},${Math.max(2, Math.min(28, y))}`);
    }
    return `M${points.join(" L")}`;
  });

  return (
    <div class="heartbeat" title="Manuscript Heartbeat">
      <svg class="heartbeat__svg" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d={ekg()} fill="none" stroke="var(--color-accent)" stroke-width="1" opacity="0.6" />
      </svg>
      <span class="heartbeat__label">
        {metrics()?.health || 0}%
      </span>

      <style>{`
        .heartbeat {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 0 var(--space-sm);
        }
        .heartbeat__svg {
          width: 60px;
          height: 16px;
        }
        .heartbeat__label {
          font-size: 10px;
          color: var(--color-ghost);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
};
