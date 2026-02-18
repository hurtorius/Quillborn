import { Component, For, createSignal, createMemo } from "solid-js";
import { manuscriptStore, ManuscriptNode } from "@/stores/manuscript";

type SortField = "title" | "status" | "word_count" | "mood" | "pov";

export const OutlineView: Component = () => {
  const { store } = manuscriptStore;
  const [sortField, setSortField] = createSignal<SortField>("title");
  const [sortAsc, setSortAsc] = createSignal(true);
  const [filterStatus, setFilterStatus] = createSignal<string | null>(null);

  const chapters = createMemo(() => {
    if (!store.project) return [];
    let nodes = Object.values(store.project.structure.nodes).filter(
      (n) => n.node_type === "chapter"
    );
    if (filterStatus()) {
      nodes = nodes.filter((n) => n.status === filterStatus());
    }
    const field = sortField();
    const asc = sortAsc();
    nodes.sort((a, b) => {
      let av: any = a[field] || "";
      let bv: any = b[field] || "";
      if (field === "word_count") { av = a.word_count; bv = b.word_count; }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return nodes;
  });

  const totalWords = createMemo(() => chapters().reduce((sum, c) => sum + c.word_count, 0));

  const handleSort = (field: SortField) => {
    if (sortField() === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleRowClick = async (chapter: ManuscriptNode) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const data = await invoke("get_chapter_content", {
        projectPath: store.project!.path,
        chapterId: chapter.id,
      });
      manuscriptStore.setActiveChapter(data as any);
    } catch (e) {
      console.error(e);
    }
  };

  const SortIcon = (props: { field: SortField }) => (
    <span class="outline__sort-icon">
      {sortField() === props.field ? (sortAsc() ? "\u25B2" : "\u25BC") : ""}
    </span>
  );

  return (
    <div class="outline-view">
      <div class="outline__toolbar">
        <span class="outline__title">Outline</span>
        <div class="outline__filters">
          <select
            class="outline__filter-select"
            value={filterStatus() || ""}
            onChange={(e) => setFilterStatus(e.currentTarget.value || null)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="revised">Revised</option>
            <option value="final">Final</option>
            <option value="trash">Trash</option>
          </select>
        </div>
        <span class="outline__total">{totalWords().toLocaleString()} words total</span>
      </div>

      <div class="outline__table-wrapper">
        <table class="outline__table">
          <thead>
            <tr>
              <th class="outline__th" onClick={() => handleSort("title")}>
                Title <SortIcon field="title" />
              </th>
              <th class="outline__th" onClick={() => handleSort("status")}>
                Status <SortIcon field="status" />
              </th>
              <th class="outline__th" onClick={() => handleSort("word_count")}>
                Words <SortIcon field="word_count" />
              </th>
              <th class="outline__th" onClick={() => handleSort("mood")}>
                Mood <SortIcon field="mood" />
              </th>
              <th class="outline__th" onClick={() => handleSort("pov")}>
                POV <SortIcon field="pov" />
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={chapters()}>
              {(chapter) => (
                <tr
                  class={`outline__row ${store.activeChapterId === chapter.id ? "outline__row--active" : ""}`}
                  onClick={() => handleRowClick(chapter)}
                >
                  <td class="outline__td outline__td--title">{chapter.title}</td>
                  <td class="outline__td">
                    <span class={`status-stamp status-stamp--${chapter.status}`}>{chapter.status}</span>
                  </td>
                  <td class="outline__td outline__td--numeric">{chapter.word_count.toLocaleString()}</td>
                  <td class="outline__td">{chapter.mood || "\u2014"}</td>
                  <td class="outline__td">{chapter.pov || "\u2014"}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <style>{`
        .outline-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-raised);
          overflow: hidden;
        }
        .outline__toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
          flex-shrink: 0;
        }
        .outline__title {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: 600;
        }
        .outline__filters { flex: 1; }
        .outline__filter-select {
          font-size: var(--font-size-xs);
          padding: 3px var(--space-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: var(--font-ui);
        }
        .outline__total {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-variant-numeric: tabular-nums;
        }
        .outline__table-wrapper {
          flex: 1;
          overflow: auto;
        }
        .outline__table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-sm);
        }
        .outline__th {
          padding: var(--space-sm) var(--space-md);
          text-align: left;
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-ghost);
          border-bottom: 1px solid var(--color-border-subtle);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .outline__th:hover { color: var(--color-ink); }
        .outline__sort-icon {
          font-size: 8px;
          margin-left: 4px;
        }
        .outline__row {
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .outline__row:hover { background: var(--color-bone-dust); }
        .outline__row--active { background: var(--color-accent-muted); }
        .outline__td {
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-ink);
        }
        .outline__td--title { font-weight: 500; }
        .outline__td--numeric { font-variant-numeric: tabular-nums; text-align: right; }
      `}</style>
    </div>
  );
};
