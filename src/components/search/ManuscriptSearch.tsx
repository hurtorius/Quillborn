import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";
import { Modal } from "@/components/ui/Modal";

interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  matches: { line: number; text: string; matchStart: number; matchEnd: number }[];
}

interface ManuscriptSearchProps {
  open: boolean;
  onClose: () => void;
}

export const ManuscriptSearch: Component<ManuscriptSearchProps> = (props) => {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [searchDone, setSearchDone] = createSignal(false);
  const { store, setActiveChapter } = manuscriptStore;

  let inputRef: HTMLInputElement | undefined;

  const totalMatches = createMemo(() =>
    results().reduce((sum, r) => sum + r.matches.length, 0)
  );

  const stripFrontmatter = (content: string): string => {
    if (!content.startsWith("---")) return content;
    const endIndex = content.indexOf("---", 3);
    if (endIndex === -1) return content;
    return content.substring(endIndex + 3).trimStart();
  };

  const performSearch = async () => {
    const q = query().trim();
    if (!q || !store.project) return;

    setSearching(true);
    setSearchDone(false);
    setResults([]);

    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const nodes = store.project.structure.nodes;
      const order = store.project.structure.order;
      const searchResults: SearchResult[] = [];
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, "gi");

      for (const nodeId of order) {
        const node = nodes[nodeId];
        if (!node || node.node_type !== "chapter") continue;

        try {
          const filePath = `${store.project.path}/chapters/${nodeId}.md`;
          const raw = await readTextFile(filePath);
          const content = stripFrontmatter(raw);
          const lines = content.split("\n");
          const matches: SearchResult["matches"] = [];

          for (let i = 0; i < lines.length; i++) {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(lines[i])) !== null) {
              matches.push({
                line: i + 1,
                text: lines[i],
                matchStart: match.index,
                matchEnd: match.index + match[0].length,
              });
              if (matches.length > 100) break;
            }
            if (matches.length > 100) break;
          }

          if (matches.length > 0) {
            searchResults.push({
              chapterId: nodeId,
              chapterTitle: node.title,
              matches,
            });
          }
        } catch {
          // Chapter file may not exist yet
        }
      }

      setResults(searchResults);
    } catch {
      // Tauri plugin not available in dev
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const handleResultClick = async (chapterId: string) => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chapter = await invoke("load_chapter", {
        projectPath: store.project.path,
        chapterId,
      });
      setActiveChapter(chapter as any);
      props.onClose();
    } catch {
      // Fallback: just set active chapter id
      const node = store.project.structure.nodes[chapterId];
      if (node) {
        setActiveChapter({
          id: chapterId,
          title: node.title,
          content: "",
          status: node.status,
          mood: node.mood,
          pov: node.pov,
          word_count: node.word_count,
          created_at: "",
          modified_at: "",
        });
      }
      props.onClose();
    }
  };

  const highlightText = (text: string, matchStart: number, matchEnd: number) => {
    const before = text.substring(Math.max(0, matchStart - 40), matchStart);
    const matched = text.substring(matchStart, matchEnd);
    const after = text.substring(matchEnd, matchEnd + 40);
    const prefix = matchStart > 40 ? "..." : "";
    const suffix = matchEnd + 40 < text.length ? "..." : "";

    return (
      <span class="manuscript-search__snippet">
        {prefix}{before}
        <mark class="manuscript-search__highlight">{matched}</mark>
        {after}{suffix}
      </span>
    );
  };

  return (
    <Modal open={props.open} onClose={props.onClose} title="Search Manuscript" width="640px">
      <div class="manuscript-search">
        <div class="manuscript-search__input-row">
          <input
            ref={inputRef}
            class="manuscript-search__input"
            type="text"
            placeholder="Search across all chapters..."
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            autofocus
          />
          <button
            class="manuscript-search__btn"
            onClick={performSearch}
            disabled={searching() || !query().trim()}
          >
            {searching() ? "Searching..." : "Search"}
          </button>
        </div>

        <Show when={searchDone()}>
          <div class="manuscript-search__summary">
            {totalMatches() === 0
              ? "No matches found."
              : `${totalMatches()} match${totalMatches() !== 1 ? "es" : ""} in ${results().length} chapter${results().length !== 1 ? "s" : ""}`}
          </div>
        </Show>

        <div class="manuscript-search__results">
          <For each={results()}>
            {(result) => (
              <div class="manuscript-search__chapter-group">
                <div
                  class="manuscript-search__chapter-header"
                  onClick={() => handleResultClick(result.chapterId)}
                >
                  <span class="manuscript-search__chapter-title">
                    {result.chapterTitle}
                  </span>
                  <span class="manuscript-search__match-count">
                    {result.matches.length} match{result.matches.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div class="manuscript-search__match-list">
                  <For each={result.matches.slice(0, 10)}>
                    {(match) => (
                      <div
                        class="manuscript-search__match-item"
                        onClick={() => handleResultClick(result.chapterId)}
                      >
                        <span class="manuscript-search__line-num">L{match.line}</span>
                        {highlightText(match.text, match.matchStart, match.matchEnd)}
                      </div>
                    )}
                  </For>
                  <Show when={result.matches.length > 10}>
                    <div class="manuscript-search__more">
                      +{result.matches.length - 10} more matches
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <style>{`
        .manuscript-search {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .manuscript-search__input-row {
          display: flex;
          gap: var(--space-sm);
          align-items: center;
        }

        .manuscript-search__input {
          flex: 1;
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: var(--color-bone);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-sm) var(--space-md);
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .manuscript-search__input:focus {
          border-color: var(--color-accent);
        }

        .manuscript-search__input::placeholder {
          color: var(--color-ghost);
        }

        .manuscript-search__btn {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-bone);
          background: var(--color-ink);
          border: 1px solid var(--color-ink);
          border-radius: var(--radius-sm);
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          white-space: nowrap;
          transition: background var(--transition-fast);
        }

        .manuscript-search__btn:hover:not(:disabled) {
          background: var(--color-ink-wash);
        }

        .manuscript-search__btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .manuscript-search__summary {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          padding: var(--space-xs) 0;
        }

        .manuscript-search__results {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          max-height: 400px;
          overflow-y: auto;
        }

        .manuscript-search__chapter-group {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .manuscript-search__chapter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-surface-raised);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .manuscript-search__chapter-header:hover {
          background: var(--color-bone-dust);
        }

        .manuscript-search__chapter-title {
          font-family: var(--font-display);
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-ink);
        }

        .manuscript-search__match-count {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .manuscript-search__match-list {
          display: flex;
          flex-direction: column;
        }

        .manuscript-search__match-item {
          display: flex;
          align-items: baseline;
          gap: var(--space-sm);
          padding: var(--space-xs) var(--space-md);
          cursor: pointer;
          transition: background var(--transition-fast);
          border-top: 1px solid var(--color-border-subtle);
        }

        .manuscript-search__match-item:hover {
          background: var(--color-bone-dust);
        }

        .manuscript-search__line-num {
          font-family: var(--font-mono);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          min-width: 32px;
          flex-shrink: 0;
        }

        .manuscript-search__snippet {
          font-size: var(--font-size-xs);
          color: var(--color-ink-wash);
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .manuscript-search__highlight {
          background: var(--color-accent-muted);
          color: var(--color-accent);
          padding: 0 2px;
          border-radius: 2px;
          font-weight: 600;
        }

        .manuscript-search__more {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          padding: var(--space-xs) var(--space-md);
          border-top: 1px solid var(--color-border-subtle);
          font-style: italic;
        }
      `}</style>
    </Modal>
  );
};
