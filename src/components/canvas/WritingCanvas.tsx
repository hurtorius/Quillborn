import { Component, Show, For, createSignal, createEffect, onCleanup, createMemo } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";
import { writingStore } from "@/stores/writing";
import { FindReplace } from "./FindReplace";
import { ProseRhythm } from "./ProseRhythm";
import { PalimpsestLayer } from "./PalimpsestLayer";
import { SessionProgress } from "./SessionProgress";
import { MoodAtmosphere } from "./MoodAtmosphere";

export const WritingCanvas: Component = () => {
  const { store, updateChapterContent } = manuscriptStore;
  let textareaRef: HTMLTextAreaElement | undefined;
  let scrollRef: HTMLDivElement | undefined;
  let saveTimeout: number | undefined;

  const [focused, setFocused] = createSignal(false);
  const [cursorPosition, setCursorPosition] = createSignal(0);
  const [cursorLine, setCursorLine] = createSignal(0);
  const [previousContent, setPreviousContent] = createSignal("");

  // Smart punctuation engine
  const applySmartPunctuation = (text: string, pos: number): { text: string; offset: number } => {
    if (!writingStore.smartPunctuation()) return { text, offset: 0 };
    const before = text.substring(0, pos);
    const after = text.substring(pos);
    let newBefore = before;
    let offset = 0;

    // Smart quotes
    if (newBefore.endsWith('"')) {
      const charBefore = newBefore.length > 1 ? newBefore[newBefore.length - 2] : " ";
      if (charBefore === " " || charBefore === "\n" || charBefore === "(" || charBefore === "[") {
        newBefore = newBefore.slice(0, -1) + "\u201C"; // Opening double quote
      } else {
        newBefore = newBefore.slice(0, -1) + "\u201D"; // Closing double quote
      }
    }
    if (newBefore.endsWith("'")) {
      const charBefore = newBefore.length > 1 ? newBefore[newBefore.length - 2] : " ";
      if (charBefore === " " || charBefore === "\n" || charBefore === "(" || charBefore === "[") {
        newBefore = newBefore.slice(0, -1) + "\u2018"; // Opening single quote
      } else {
        newBefore = newBefore.slice(0, -1) + "\u2019"; // Closing single / apostrophe
      }
    }
    // Em dash: --- → —
    if (newBefore.endsWith("---")) {
      newBefore = newBefore.slice(0, -3) + "\u2014";
      offset = -2;
    }
    // En dash: -- → –
    else if (newBefore.endsWith("--") && !newBefore.endsWith("---")) {
      newBefore = newBefore.slice(0, -2) + "\u2013";
      offset = -1;
    }
    // Ellipsis: ... → …
    if (newBefore.endsWith("...")) {
      newBefore = newBefore.slice(0, -3) + "\u2026";
      offset = -2;
    }

    return { text: newBefore + after, offset };
  };

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
    let value = target.value;
    let cursorPos = target.selectionStart;

    // Smart punctuation
    const result = applySmartPunctuation(value, cursorPos);
    if (result.text !== value) {
      value = result.text;
      cursorPos += result.offset;
      target.value = value;
      target.selectionStart = target.selectionEnd = cursorPos;
    }

    // Palimpsest: track deletions
    const prev = previousContent();
    if (prev.length > value.length && store.activeChapter) {
      const deletedText = findDeletedText(prev, value);
      if (deletedText.length > 1) {
        writingStore.addPalimpsestFragment({
          id: crypto.randomUUID(),
          chapterId: store.activeChapter.id,
          text: deletedText,
          position: cursorPos,
          deletedAt: Date.now(),
        });
      }
    }
    setPreviousContent(value);

    // Unwriting mode: track words
    if (writingStore.unwritingMode()) {
      const words = value.split(/\s+/).filter(Boolean).length;
      const startWords = writingStore.unwritingStartContent().split(/\s+/).filter(Boolean).length;
      writingStore.setUnwritingWordCount(Math.max(0, words - startWords));
    }

    updateChapterContent(value);
    scheduleAutosave();
    updateCursorInfo(target);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.currentTarget as HTMLTextAreaElement;

    // Unwriting mode: block backspace and delete
    if (writingStore.unwritingMode()) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        return;
      }
      // Also block Ctrl+X (cut), Ctrl+Z (undo)
      if ((e.metaKey || e.ctrlKey) && (e.key === "x" || e.key === "z")) {
        e.preventDefault();
        return;
      }
    }

    // Tab key inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
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

    updateCursorInfo(target);
  };

  const handleManualSave = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      if (store.activeChapter && store.isDirty) {
        await invoke("update_chapter", {
          projectPath: store.project.path,
          chapterId: store.activeChapter.id,
          content: store.activeChapter.content,
        });
        manuscriptStore.markClean();
      }
      await invoke("create_snapshot", {
        projectPath: store.project.path,
        name: "manual",
      });
    } catch (e) {
      console.error("Manual save failed:", e);
    }
  };

  const updateCursorInfo = (target: HTMLTextAreaElement) => {
    setCursorPosition(target.selectionStart);
    const text = target.value.substring(0, target.selectionStart);
    setCursorLine(text.split("\n").length);
  };

  // Typewriter scroll: keep cursor vertically centered
  const handleScroll = () => {
    if (!writingStore.typewriterMode() || !textareaRef || !scrollRef) return;
    const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 28;
    const scrollTop = (cursorLine() - 1) * lineHeight - scrollRef.clientHeight / 2;
    scrollRef.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
  };

  createEffect(() => {
    cursorLine();
    if (writingStore.typewriterMode()) handleScroll();
  });

  onCleanup(() => clearTimeout(saveTimeout));

  // Initialize previous content when chapter changes
  createEffect(() => {
    if (store.activeChapter) {
      setPreviousContent(store.activeChapter.content);
      if (writingStore.unwritingMode()) {
        writingStore.setUnwritingStartContent(store.activeChapter.content);
      }
      if (textareaRef) textareaRef.focus();
    }
  });

  // Focus mode CSS class
  const focusModeClass = createMemo(() => {
    switch (writingStore.focusMode()) {
      case "sentence": return "writing-canvas--focus-sentence";
      case "paragraph": return "writing-canvas--focus-paragraph";
      case "distraction-free": return "writing-canvas--distraction-free";
      default: return "";
    }
  });

  const moodClass = createMemo(() => {
    const mood = writingStore.chapterMood();
    return mood ? `writing-canvas--mood-${mood}` : "";
  });

  // Sentences for rhythm visualizer
  const sentences = createMemo(() => {
    const content = store.activeChapter?.content || "";
    return content.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  });

  return (
    <main class={`writing-canvas ${focusModeClass()} ${moodClass()} ${writingStore.unwritingMode() ? "writing-canvas--unwriting" : ""} ${writingStore.typewriterMode() ? "writing-canvas--typewriter" : ""}`}>
      <MoodAtmosphere mood={writingStore.chapterMood()} />

      <Show when={store.activeChapter}>
        <SessionProgress />
      </Show>

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
        <div class="writing-canvas__scroll" ref={scrollRef}>
          <div class="writing-canvas__page">
            <Show when={writingStore.unwritingMode()}>
              <div class="writing-canvas__unwriting-bar">
                <span class="writing-canvas__unwriting-label">UNWRITING MODE</span>
                <span class="writing-canvas__unwriting-count">
                  +{writingStore.unwritingWordCount()} words
                </span>
              </div>
            </Show>

            <div class="writing-canvas__header">
              <h1 class="writing-canvas__chapter-title">{store.activeChapter!.title}</h1>
            </div>

            <div class="writing-canvas__body">
              <Show when={sentences().length > 0}>
                <ProseRhythm sentences={sentences()} />
              </Show>

              <div class="writing-canvas__editor-container">
                <Show when={writingStore.palimpsestVisible()}>
                  <PalimpsestLayer
                    fragments={writingStore.palimpsestFragments().filter(
                      (f) => f.chapterId === store.activeChapter!.id
                    )}
                  />
                </Show>

                <textarea
                  ref={textareaRef}
                  class="writing-canvas__textarea"
                  value={store.activeChapter!.content}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onClick={(e) => updateCursorInfo(e.currentTarget)}
                  placeholder="Begin writing..."
                  spellcheck={true}
                />
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={writingStore.findReplaceOpen()}>
        <FindReplace />
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
          transition: background var(--transition-slow), padding var(--transition-slow);
        }

        /* === Empty state === */
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

        /* === Scroll & Page === */
        .writing-canvas__scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          padding: var(--space-2xl) var(--space-xl);
          scroll-behavior: smooth;
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

        /* === Body with rhythm margin === */
        .writing-canvas__body {
          display: flex;
          gap: var(--space-md);
        }

        /* === Editor === */
        .writing-canvas__editor-container {
          position: relative;
          flex: 1;
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
          transition: color var(--transition-slow), font-family var(--transition-slow);
        }
        .writing-canvas__textarea::placeholder {
          color: var(--color-ghost);
          font-style: italic;
          opacity: 0.5;
        }
        .writing-canvas__textarea::selection {
          background: var(--color-selection);
        }

        /* === Focus Mode: Sentence === */
        .writing-canvas--focus-sentence .writing-canvas__textarea {
          color: var(--color-ghost);
        }

        /* === Focus Mode: Paragraph === */
        .writing-canvas--focus-paragraph .writing-canvas__textarea {
          color: var(--color-ghost);
        }

        /* === Focus Mode: Distraction Free === */
        .writing-canvas--distraction-free {
          position: fixed;
          inset: 0;
          z-index: 9000;
          animation: ink-dissolve-in var(--transition-slow) ease both;
        }
        .writing-canvas--distraction-free .writing-canvas__header {
          display: none;
        }
        .writing-canvas--distraction-free .writing-canvas__scroll {
          padding: 20vh var(--space-xl);
        }
        .writing-canvas--distraction-free .writing-canvas__textarea {
          font-size: 1.25rem;
          line-height: 2;
          color: var(--color-ink);
        }

        /* === Typewriter Mode === */
        .writing-canvas--typewriter .writing-canvas__scroll {
          padding-top: 45vh;
          padding-bottom: 45vh;
        }

        /* === Unwriting Mode === */
        .writing-canvas--unwriting {
          background: var(--color-bone-dust);
        }
        .writing-canvas--unwriting .writing-canvas__textarea {
          font-family: 'JetBrains Mono', var(--font-mono);
          letter-spacing: 0.02em;
        }
        .writing-canvas__unwriting-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-status-draft);
          color: var(--color-bone);
          font-size: var(--font-size-xs);
          letter-spacing: 0.1em;
          margin-bottom: var(--space-md);
          border-radius: var(--radius-sm);
        }
        .writing-canvas__unwriting-label {
          font-weight: 700;
        }
        .writing-canvas__unwriting-count {
          font-variant-numeric: tabular-nums;
        }

        /* === Mood Atmosphere Tints === */
        .writing-canvas--mood-tension { --canvas-warmth: -0.02; --canvas-grain: 0.06; --canvas-vignette: 0.12; }
        .writing-canvas--mood-grief { --canvas-warmth: -0.03; --canvas-grain: 0.04; --canvas-vignette: 0.15; }
        .writing-canvas--mood-joy { --canvas-warmth: 0.04; --canvas-grain: 0.01; --canvas-vignette: 0.03; }
        .writing-canvas--mood-dread { --canvas-warmth: -0.05; --canvas-grain: 0.07; --canvas-vignette: 0.2; }
        .writing-canvas--mood-calm { --canvas-warmth: 0.02; --canvas-grain: 0.01; --canvas-vignette: 0.02; }
        .writing-canvas--mood-chaos { --canvas-warmth: 0; --canvas-grain: 0.09; --canvas-vignette: 0.1; }
        .writing-canvas--mood-romance { --canvas-warmth: 0.05; --canvas-grain: 0.02; --canvas-vignette: 0.05; }
        .writing-canvas--mood-mystery { --canvas-warmth: -0.04; --canvas-grain: 0.05; --canvas-vignette: 0.18; }
        .writing-canvas--mood-action { --canvas-warmth: 0; --canvas-grain: 0.04; --canvas-vignette: 0.08; }
        .writing-canvas--mood-reflection { --canvas-warmth: 0.03; --canvas-grain: 0.02; --canvas-vignette: 0.06; }
      `}</style>
    </main>
  );
};

function findDeletedText(before: string, after: string): string {
  let start = 0;
  while (start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length - 1;
  let endAfter = after.length - 1;
  while (endBefore > start && endAfter > start && before[endBefore] === after[endAfter]) {
    endBefore--;
    endAfter--;
  }
  return before.substring(start, endBefore + 1);
}
