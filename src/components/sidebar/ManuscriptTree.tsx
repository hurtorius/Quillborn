import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { manuscriptStore, ManuscriptNode } from "@/stores/manuscript";
import { TreeNode } from "./TreeNode";
import { Button } from "@/components/ui/Button";

export const ManuscriptTree: Component = () => {
  const { store, toggleSidebar } = manuscriptStore;
  const [filter, setFilter] = createSignal("");

  const rootNode = createMemo(() => {
    if (!store.project) return null;
    return store.project.structure.nodes[store.project.structure.root] || null;
  });

  const childNodes = createMemo(() => {
    if (!rootNode() || !store.project) return [];
    const root = rootNode()!;
    return root.children
      .map((id) => store.project!.structure.nodes[id])
      .filter(Boolean)
      .filter((node) => {
        if (!filter()) return true;
        return node.title.toLowerCase().includes(filter().toLowerCase());
      });
  });

  const handleAddChapter = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chapter = await invoke("create_chapter", {
        projectPath: store.project.path,
        title: "Untitled Chapter",
        parentId: null,
      });
      manuscriptStore.addNode(
        {
          id: (chapter as any).id,
          title: (chapter as any).title,
          node_type: "chapter",
          children: [],
          status: "draft",
          word_count: 0,
        },
      );
    } catch (e) {
      console.error("Failed to create chapter:", e);
    }
  };

  return (
    <Show when={store.sidebarOpen}>
      <aside class="manuscript-tree anim-sidebar-unfold">
        <div class="manuscript-tree__header">
          <div class="manuscript-tree__title-row">
            <h2 class="manuscript-tree__title">
              {store.project?.metadata.title || "Manuscript"}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
              title="Close sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 2L4 7L10 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </Button>
          </div>

          <div class="manuscript-tree__search">
            <svg class="manuscript-tree__search-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1"/>
              <path d="M8 8L11 11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <input
              class="manuscript-tree__search-input"
              type="text"
              placeholder="Filter chapters..."
              value={filter()}
              onInput={(e) => setFilter(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="manuscript-tree__content">
          <For each={childNodes()}>
            {(node) => (
              <TreeNode
                node={node}
                depth={0}
                allNodes={store.project?.structure.nodes || {}}
              />
            )}
          </For>

          <Show when={childNodes().length === 0 && !filter()}>
            <div class="manuscript-tree__empty">
              <p>No chapters yet.</p>
              <p class="manuscript-tree__empty-hint">Create your first chapter to begin writing.</p>
            </div>
          </Show>
        </div>

        <div class="manuscript-tree__footer">
          <button class="manuscript-tree__add-btn" onClick={handleAddChapter}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            <span>New Chapter</span>
          </button>
        </div>

        <style>{`
          .manuscript-tree {
            width: var(--sidebar-width);
            min-width: var(--sidebar-width);
            height: 100%;
            background: var(--color-surface-raised);
            border-right: 1px solid var(--color-border-subtle);
            display: flex;
            flex-direction: column;
            z-index: var(--z-sidebar);
            overflow: hidden;
          }

          .manuscript-tree__header {
            padding: var(--space-md);
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            border-bottom: 1px solid var(--color-border-subtle);
          }

          .manuscript-tree__title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .manuscript-tree__title {
            font-family: var(--font-display);
            font-size: var(--font-size-base);
            font-weight: 600;
            color: var(--color-ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .manuscript-tree__search {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-xs) var(--space-sm);
            background: var(--color-bone);
            border-radius: var(--radius-sm);
          }

          .manuscript-tree__search-icon {
            color: var(--color-ghost);
            flex-shrink: 0;
          }

          .manuscript-tree__search-input {
            flex: 1;
            font-size: var(--font-size-sm);
            color: var(--color-ink);
            background: transparent;
            border: none;
            outline: none;
            min-width: 0;
          }

          .manuscript-tree__search-input::placeholder {
            color: var(--color-ghost);
          }

          .manuscript-tree__content {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-xs) 0;
          }

          .manuscript-tree__empty {
            padding: var(--space-xl) var(--space-md);
            text-align: center;
            color: var(--color-ghost);
            font-size: var(--font-size-sm);
          }

          .manuscript-tree__empty-hint {
            margin-top: var(--space-xs);
            font-size: var(--font-size-xs);
            opacity: 0.7;
          }

          .manuscript-tree__footer {
            padding: var(--space-sm) var(--space-md);
            border-top: 1px solid var(--color-border-subtle);
          }

          .manuscript-tree__add-btn {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            width: 100%;
            padding: var(--space-sm) var(--space-sm);
            font-size: var(--font-size-sm);
            color: var(--color-ghost);
            border-radius: var(--radius-sm);
            transition: color var(--transition-fast), background var(--transition-fast);
          }

          .manuscript-tree__add-btn:hover {
            color: var(--color-ink);
            background: var(--color-bone-dust);
          }
        `}</style>
      </aside>
    </Show>
  );
};
