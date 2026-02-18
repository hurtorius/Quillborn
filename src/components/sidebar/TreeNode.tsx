import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { manuscriptStore, ManuscriptNode } from "@/stores/manuscript";

interface TreeNodeProps {
  node: ManuscriptNode;
  depth: number;
  allNodes: Record<string, ManuscriptNode>;
}

export const TreeNode: Component<TreeNodeProps> = (props) => {
  const { store, setActiveChapter } = manuscriptStore;
  const [collapsed, setCollapsed] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal("");
  const [dragOver, setDragOver] = createSignal(false);

  const isActive = createMemo(() => store.activeChapterId === props.node.id);
  const hasChildren = createMemo(() => props.node.children.length > 0);

  const childNodes = createMemo(() =>
    props.node.children
      .map((id) => props.allNodes[id])
      .filter(Boolean)
  );

  const wordBar = createMemo(() => {
    const max = 5000; // Proportional scale
    const ratio = Math.min(props.node.word_count / max, 1);
    return `${ratio * 100}%`;
  });

  const handleClick = async () => {
    if (props.node.node_type === "chapter" || props.node.node_type === "scene") {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const chapter = await invoke("get_chapter_content", {
          projectPath: store.project!.path,
          chapterId: props.node.id,
        });
        setActiveChapter(chapter as any);
      } catch (e) {
        console.error("Failed to load chapter:", e);
      }
    } else if (hasChildren()) {
      setCollapsed(!collapsed());
    }
  };

  const handleDoubleClick = () => {
    setEditing(true);
    setEditValue(props.node.title);
  };

  const commitRename = async () => {
    const newTitle = editValue().trim();
    if (newTitle && newTitle !== props.node.title) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("rename_chapter", {
          projectPath: store.project!.path,
          chapterId: props.node.id,
          newTitle,
        });
        manuscriptStore.renameNode(props.node.id, newTitle);
      } catch (e) {
        console.error("Failed to rename:", e);
      }
    }
    setEditing(false);
  };

  const handleRenameKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      commitRename();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData("text/plain", props.node.id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const draggedId = e.dataTransfer?.getData("text/plain");
    if (draggedId && draggedId !== props.node.id) {
      // Reorder logic handled by parent
      console.log("Dropped", draggedId, "onto", props.node.id);
    }
  };

  const statusClass = () => {
    switch (props.node.status) {
      case "revised": return "status-stamp--revised";
      case "final": return "status-stamp--final";
      case "trash": return "status-stamp--trash";
      default: return "status-stamp--draft";
    }
  };

  const nodeIcon = () => {
    switch (props.node.node_type) {
      case "part":
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1.5" y="2" width="9" height="8" rx="1" stroke="currentColor" stroke-width="1"/>
            <path d="M4 2V1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            <path d="M8 2V1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
        );
      case "chapter":
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 1.5H9.5V10.5H3C2.17 10.5 1.5 9.83 1.5 9V3C1.5 2.17 2.17 1.5 3 1.5Z" stroke="currentColor" stroke-width="1"/>
            <path d="M4 4H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M4 6H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
        );
      case "scene":
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 3H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M4 6H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M4 9H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <circle cx="2" cy="3" r="0.7" fill="currentColor"/>
            <circle cx="2" cy="6" r="0.7" fill="currentColor"/>
            <circle cx="2" cy="9" r="0.7" fill="currentColor"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div class="tree-node">
      <div
        class={`tree-node__row ${isActive() ? "tree-node__row--active" : ""} ${dragOver() ? "tree-node__row--drag-over" : ""}`}
        style={{ "padding-left": `${12 + props.depth * 16}px` }}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        draggable={true}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Show when={hasChildren()}>
          <span class={`tree-node__chevron ${collapsed() ? "" : "tree-node__chevron--open"}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2 1.5L5.5 4L2 6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </Show>
        <Show when={!hasChildren()}>
          <span class="tree-node__spacer" />
        </Show>

        <span class="tree-node__icon">{nodeIcon()}</span>

        <Show when={editing()} fallback={
          <span class="tree-node__title truncate">{props.node.title}</span>
        }>
          <input
            class="tree-node__rename-input"
            value={editValue()}
            onInput={(e) => setEditValue(e.currentTarget.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            ref={(el) => setTimeout(() => el.focus(), 0)}
          />
        </Show>

        <Show when={props.node.word_count > 0}>
          <span class="tree-node__word-count">{props.node.word_count.toLocaleString()}</span>
        </Show>
      </div>

      <Show when={props.node.word_count > 0}>
        <div class="tree-node__word-bar" style={{ "padding-left": `${12 + props.depth * 16 + 28}px` }}>
          <div class="tree-node__word-bar-fill" style={{ width: wordBar() }} />
        </div>
      </Show>

      <Show when={!collapsed() && hasChildren()}>
        <div class="tree-node__children">
          <For each={childNodes()}>
            {(child) => (
              <TreeNode
                node={child}
                depth={props.depth + 1}
                allNodes={props.allNodes}
              />
            )}
          </For>
        </div>
      </Show>

      <style>{`
        .tree-node {
          width: 100%;
        }

        .tree-node__row {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          cursor: pointer;
          transition: background var(--transition-fast);
          min-height: 28px;
        }

        .tree-node__row:hover {
          background: var(--color-bone-dust);
        }

        .tree-node__row--active {
          background: var(--color-accent-muted);
          color: var(--color-accent);
        }

        .tree-node__row--active:hover {
          background: var(--color-accent-muted);
        }

        .tree-node__row--drag-over {
          background: var(--color-accent-muted);
          outline: 1px dashed var(--color-accent);
          outline-offset: -1px;
        }

        .tree-node__chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          color: var(--color-ghost);
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }

        .tree-node__chevron--open {
          transform: rotate(90deg);
        }

        .tree-node__spacer {
          width: 14px;
          flex-shrink: 0;
        }

        .tree-node__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          color: var(--color-ghost);
          flex-shrink: 0;
        }

        .tree-node__row--active .tree-node__icon {
          color: var(--color-accent);
        }

        .tree-node__title {
          flex: 1;
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          min-width: 0;
        }

        .tree-node__row--active .tree-node__title {
          color: var(--color-accent);
          font-weight: 500;
        }

        .tree-node__rename-input {
          flex: 1;
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: var(--color-surface);
          border: 1px solid var(--color-accent);
          border-radius: var(--radius-sm);
          padding: 1px 4px;
          min-width: 0;
          outline: none;
        }

        .tree-node__word-count {
          font-size: 10px;
          color: var(--color-ghost);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          opacity: 0.7;
        }

        .tree-node__word-bar {
          height: 2px;
          padding-right: 12px;
          margin-top: -2px;
          margin-bottom: 1px;
        }

        .tree-node__word-bar-fill {
          height: 100%;
          background: var(--color-ghost);
          border-radius: 1px;
          opacity: 0.3;
          transition: width var(--transition-base);
        }

        .tree-node__children {
          /* No additional styling needed */
        }
      `}</style>
    </div>
  );
};
