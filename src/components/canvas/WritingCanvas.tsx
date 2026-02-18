import { Component, Show, createSignal, createEffect, onMount, onCleanup, createMemo } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";

export const WritingCanvas: Component = () => {
  const { store, updateChapterContent, setActiveChapter } = manuscriptStore;
  let textareaRef: HTMLTextAreaElement | undefined;
  let saveTimeout: number | undefined;

  const [focused, setFocused] = createSignal(false);
  const [cursorLine, setCursorLine] = createSignal(0);

  // Autosave: debounced save on content change
  const scheduleAutosave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = window.setTimeout(async () => {
      if (!store.project || !store.activeChapter || !store.isDirty) return;
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("update_chapter", {
          projectPath: store.project.path,
          chapterId: store.activeChapter.id,
          content: store.activeChapter.content,
        });
        manuscriptStore.markClean();
        manuscriptStore.updateNodeWordCount(
          store.activeChapter.id,
          store.activeChapter.word_count
        );
      } catch (e) {
        console.error("Autosave failed:", e);
      }
    }, 1500);
  };

  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    updateChapterContent(target.value);
    scheduleAutosave();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Tab key inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + "    " + value.substring(end);
      target.value = newValue;
      target.selectionStart = target.selectionEnd = start + 4;
      updateChapterContent(newValue);
      scheduleAutosave();
    }

    // Cmd+S triggers manual snapshot
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleManualSave();
    }

    // Track cursor position for line highlight
    updateCursorLine(e.currentTarget as HTMLTextAreaElement);
  };

  const handleManualSave = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");

      // Save current chapter first
      if (store.activeChapter && store.isDirty) {
        await invoke("update_chapter", {
          projectPath: store.project.path,
          chapterId: store.activeChapter.id,
          content: store.activeChapter.content,
        });
        manuscriptStore.markClean();
      }

      // Create named snapshot
      await invoke("create_snapshot", {
        projectPath: store.project.path,
        name: "manual",
      });
    } catch (e) {
      console.error("Manual save failed:", e);
    }
  };

  const updateCursorLine = (target: HTMLTextAreaElement) => {
    const text = target.value.substring(0, target.selectionStart);
    const lines = text.split("\n").length;
    setCursorLine(lines);
  };

  const wordCount = createMemo(() => {
    return store.activeChapter?.word_count || 0;
  });

  onCleanup(() => {
    clearTimeout(saveTimeout);
  });

  // Focus textarea when chapter changes
  createEffect(() => {
    if (store.activeChapter && textareaRef) {
      textareaRef.focus();
    }
  });

  return (
    <main class="writing-canvas">
      <Show
        when={store.activeChapter}
        fallback={
          <div class="writing-canvas__empty">
            <div class="writing-canvas__empty-content anim-fade-in">
              <div class="writing-canvas__quill">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M36 4C36 4 42 10 42 16C42 22 36 28 30 34L14 34L12 44L10 44L14 28L14 16C14 10 20 4 26 4L36 4Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
                  <path d="M14 28L30 28" stroke="currentColor" stroke-width="1" opacity="0.2"/>
                  <path d="M12 44L14 34" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
                </svg>
              </div>
              <Show when={store.project} fallback={
                <div>
                  <p class="writing-canvas__empty-title">Quillborn</p>
                  <p class="writing-canvas__empty-subtitle">Where books are born</p>
                  <p class="writing-canvas__empty-hint">Create or open a project to begin</p>
                </div>
              }>
                <div>
                  <p class="writing-canvas__empty-title">{store.project!.metadata.title}</p>
                  <p class="writing-canvas__empty-hint">Select a chapter from the sidebar, or create a new one</p>
                </div>
              </Show>
            </div>
          </div>
        }
      >
        <div class="writing-canvas__scroll">
          <div class="writing-canvas__page">
            <div class="writing-canvas__header">
              <h1 class="writing-canvas__chapter-title">{store.activeChapter!.title}</h1>
            </div>
            <div class="writing-canvas__editor-container">
              <textarea
                ref={textareaRef}
                class="writing-canvas__textarea"
                value={store.activeChapter!.content}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onClick={(e) => updateCursorLine(e.currentTarget)}
                placeholder="Begin writing..."
                spellcheck={true}
              />
            </div>
          </div>
        </div>
      </Show>

      <style>{`
        .writing-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--color-parchment);
          position: relative;
          z-index: var(--z-canvas);
        }

        .writing-canvas__empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .writing-canvas__empty-content {
          text-align: center;
          color: var(--color-ghost);
        }

        .writing-canvas__quill {
          margin-bottom: var(--space-lg);
          animation: ink-drip-pulse 3s ease-in-out infinite;
        }

        .writing-canvas__empty-title {
          font-family: var(--font-display);
          font-size: var(--font-size-2xl);
          color: var(--color-ink);
          margin-bottom: var(--space-xs);
          font-weight: 400;
        }

        .writing-canvas__empty-subtitle {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          color: var(--color-ghost);
          font-style: italic;
          margin-bottom: var(--space-lg);
        }

        .writing-canvas__empty-hint {
          font-size: var(--font-size-sm);
          color: var(--color-ghost);
          opacity: 0.7;
        }

        .writing-canvas__scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          padding: var(--space-2xl) var(--space-xl);
        }

        .writing-canvas__page {
          width: 100%;
          max-width: var(--canvas-max-width);
          min-height: 100%;
        }

        .writing-canvas__header {
          margin-bottom: var(--space-2xl);
          padding-bottom: var(--space-lg);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .writing-canvas__chapter-title {
          font-family: var(--font-display);
          font-size: var(--font-size-3xl);
          font-weight: 400;
          color: var(--color-ink);
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .writing-canvas__editor-container {
          position: relative;
        }

        .writing-canvas__textarea {
          width: 100%;
          min-height: calc(100vh - 300px);
          font-family: var(--font-canvas);
          font-size: var(--font-size-canvas);
          line-height: 1.8;
          color: var(--color-ink);
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          padding: 0;
          caret-color: var(--color-accent);
          user-select: text;
        }

        .writing-canvas__textarea::placeholder {
          color: var(--color-ghost);
          font-style: italic;
          opacity: 0.5;
        }

        .writing-canvas__textarea::selection {
          background: var(--color-selection);
        }
      `}</style>
    </main>
  );
};
