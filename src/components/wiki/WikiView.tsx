import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { planningStore, WikiEntry } from "@/stores/planning";
import { Button } from "@/components/ui/Button";

const CATEGORIES = ["locations", "factions", "objects", "lore", "rules", "history"] as const;

export const WikiView: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [category, setCategory] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editContent, setEditContent] = createSignal("");
  const [editCategory, setEditCategory] = createSignal<typeof CATEGORIES[number]>("lore");

  const entries = createMemo(() => {
    let all = Object.values(planningStore.wikiEntries);
    if (category()) all = all.filter((e) => e.category === category());
    if (searchQuery()) {
      const q = searchQuery().toLowerCase();
      all = all.filter((e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
    }
    return all.sort((a, b) => a.title.localeCompare(b.title));
  });

  const selected = createMemo(() => {
    const id = selectedId();
    return id ? planningStore.wikiEntries[id] : null;
  });

  const backlinks = createMemo(() => {
    const id = selectedId();
    return id ? planningStore.findBacklinks(id) : [];
  });

  const renderWikiContent = (content: string) => {
    // Convert [[links]] to clickable spans
    return content.replace(/\[\[(.+?)\]\]/g, (_, title) => {
      return `<span class="wiki-link" data-title="${title}">${title}</span>`;
    });
  };

  const handleCreate = () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const entry: WikiEntry = {
      id, title: "New Entry", content: "", category: editCategory(),
      linkedChapters: [], tags: [], createdAt: now, modifiedAt: now,
    };
    planningStore.addWikiEntry(entry);
    setSelectedId(id);
    setEditing(true);
    setEditTitle("New Entry");
    setEditContent("");
  };

  const handleEdit = () => {
    if (!selected()) return;
    setEditTitle(selected()!.title);
    setEditContent(selected()!.content);
    setEditCategory(selected()!.category);
    setEditing(true);
  };

  const handleSave = () => {
    if (!selectedId()) return;
    planningStore.updateWikiEntry(selectedId()!, {
      title: editTitle(), content: editContent(), category: editCategory(),
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (!selectedId()) return;
    planningStore.deleteWikiEntry(selectedId()!);
    setSelectedId(null);
    setEditing(false);
  };

  return (
    <div class="wiki-view">
      <div class="wiki-view__sidebar">
        <div class="wiki-view__search">
          <input
            class="wiki-view__search-input"
            type="text"
            placeholder="Search wiki..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>
        <div class="wiki-view__categories">
          <button class={`wiki-view__cat-btn ${!category() ? "wiki-view__cat-btn--active" : ""}`} onClick={() => setCategory(null)}>All</button>
          <For each={CATEGORIES}>
            {(cat) => (
              <button class={`wiki-view__cat-btn ${category() === cat ? "wiki-view__cat-btn--active" : ""}`} onClick={() => setCategory(cat)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            )}
          </For>
        </div>
        <div class="wiki-view__list">
          <For each={entries()}>
            {(entry) => (
              <button class={`wiki-view__entry ${selectedId() === entry.id ? "wiki-view__entry--active" : ""}`} onClick={() => { setSelectedId(entry.id); setEditing(false); }}>
                <span class="wiki-view__entry-title">{entry.title}</span>
                <span class="wiki-view__entry-cat">{entry.category}</span>
              </button>
            )}
          </For>
        </div>
        <div class="wiki-view__sidebar-footer">
          <Button size="sm" variant="ghost" onClick={handleCreate}>+ New Entry</Button>
        </div>
      </div>

      <div class="wiki-view__content">
        <Show when={selected()} fallback={
          <div class="wiki-view__empty">Select an entry or create a new one</div>
        }>
          <Show when={editing()} fallback={
            <div class="wiki-view__article">
              <div class="wiki-view__article-header">
                <h2 class="wiki-view__article-title">{selected()!.title}</h2>
                <span class="wiki-view__article-cat">{selected()!.category}</span>
                <div class="wiki-view__article-actions">
                  <Button size="sm" variant="ghost" onClick={handleEdit}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
                </div>
              </div>
              <div class="wiki-view__article-body" innerHTML={renderWikiContent(selected()!.content)} />
              <Show when={backlinks().length > 0}>
                <div class="wiki-view__backlinks">
                  <h4 class="wiki-view__backlinks-title">Backlinks</h4>
                  <For each={backlinks()}>
                    {(bl) => (
                      <button class="wiki-view__backlink" onClick={() => { setSelectedId(bl.id); setEditing(false); }}>
                        {bl.title}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          }>
            <div class="wiki-view__editor">
              <input class="wiki-view__edit-title" value={editTitle()} onInput={(e) => setEditTitle(e.currentTarget.value)} placeholder="Entry title" />
              <select class="wiki-view__edit-cat" value={editCategory()} onChange={(e) => setEditCategory(e.currentTarget.value as any)}>
                <For each={CATEGORIES}>{(cat) => <option value={cat}>{cat}</option>}</For>
              </select>
              <textarea class="wiki-view__edit-content" value={editContent()} onInput={(e) => setEditContent(e.currentTarget.value)} placeholder="Content... Use [[double brackets]] to link to other entries." />
              <div class="wiki-view__edit-actions">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      <style>{`
        .wiki-view {
          flex: 1;
          display: flex;
          overflow: hidden;
          background: var(--color-surface-raised);
        }
        .wiki-view__sidebar {
          width: 240px;
          border-right: 1px solid var(--color-border-subtle);
          display: flex;
          flex-direction: column;
        }
        .wiki-view__search {
          padding: var(--space-sm);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .wiki-view__search-input {
          width: 100%;
          font-size: var(--font-size-sm);
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-bone);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--color-ink);
          outline: none;
        }
        .wiki-view__search-input::placeholder { color: var(--color-ghost); }
        .wiki-view__categories {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: var(--space-xs) var(--space-sm);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .wiki-view__cat-btn {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          transition: all var(--transition-fast);
        }
        .wiki-view__cat-btn:hover { color: var(--color-ink); background: var(--color-bone-dust); }
        .wiki-view__cat-btn--active { color: var(--color-accent); background: var(--color-accent-muted); }
        .wiki-view__list {
          flex: 1;
          overflow-y: auto;
        }
        .wiki-view__entry {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          text-align: left;
          transition: background var(--transition-fast);
        }
        .wiki-view__entry:hover { background: var(--color-bone-dust); }
        .wiki-view__entry--active { background: var(--color-accent-muted); color: var(--color-accent); }
        .wiki-view__entry-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wiki-view__entry-cat { font-size: 9px; color: var(--color-ghost); text-transform: uppercase; }
        .wiki-view__sidebar-footer {
          padding: var(--space-sm);
          border-top: 1px solid var(--color-border-subtle);
        }
        .wiki-view__content {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-xl);
        }
        .wiki-view__empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-ghost);
          font-size: var(--font-size-sm);
        }
        .wiki-view__article-header {
          display: flex;
          align-items: baseline;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .wiki-view__article-title {
          font-family: var(--font-display);
          font-size: var(--font-size-2xl);
          font-weight: 400;
          color: var(--color-ink);
        }
        .wiki-view__article-cat {
          font-size: var(--font-size-xs);
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .wiki-view__article-actions { margin-left: auto; display: flex; gap: 4px; }
        .wiki-view__article-body {
          font-family: var(--font-canvas);
          font-size: var(--font-size-canvas);
          line-height: 1.7;
          color: var(--color-ink);
          max-width: 640px;
        }
        .wiki-view__backlinks {
          margin-top: var(--space-xl);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border-subtle);
        }
        .wiki-view__backlinks-title {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-sm);
        }
        .wiki-view__backlink {
          display: block;
          font-size: var(--font-size-sm);
          color: var(--color-accent);
          padding: 2px 0;
        }
        .wiki-view__backlink:hover { text-decoration: underline; }
        .wiki-view__editor {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          max-width: 640px;
        }
        .wiki-view__edit-title {
          font-family: var(--font-display);
          font-size: var(--font-size-xl);
          color: var(--color-ink);
          border: none;
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-sm) 0;
          background: transparent;
          outline: none;
        }
        .wiki-view__edit-title:focus { border-bottom-color: var(--color-accent); }
        .wiki-view__edit-cat {
          width: fit-content;
          font-size: var(--font-size-xs);
          padding: 3px var(--space-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: var(--font-ui);
        }
        .wiki-view__edit-content {
          font-family: var(--font-canvas);
          font-size: var(--font-size-base);
          line-height: 1.7;
          color: var(--color-ink);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-md);
          min-height: 300px;
          resize: vertical;
          background: var(--color-surface);
          outline: none;
        }
        .wiki-view__edit-content:focus { border-color: var(--color-accent); }
        .wiki-view__edit-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; }
      `}</style>
    </div>
  );
};
