import { Component, For, Show, createSignal } from "solid-js";
import { manuscriptStore } from "@/stores/manuscript";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface DetectedChapter {
  title: string;
  content: string;
  selected: boolean;
}

export const ImportWizard: Component<{ open: boolean; onClose: () => void }> = (props) => {
  const { store } = manuscriptStore;
  const [step, setStep] = createSignal<"select" | "preview" | "importing" | "done">("select");
  const [fileName, setFileName] = createSignal("");
  const [fileContent, setFileContent] = createSignal("");
  const [chapters, setChapters] = createSignal<DetectedChapter[]>([]);
  const [splitMethod, setSplitMethod] = createSignal<"heading" | "break" | "manual">("heading");

  const handleFileSelect = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: "Import File",
        filters: [
          { name: "Text Files", extensions: ["md", "txt", "markdown"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected) {
        setFileName(selected as string);
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const content = await readTextFile(selected as string);
        setFileContent(content);
        detectChapters(content);
        setStep("preview");
      }
    } catch (e) {
      console.error("Import failed:", e);
    }
  };

  const detectChapters = (content: string) => {
    const method = splitMethod();
    let detected: DetectedChapter[] = [];

    if (method === "heading") {
      // Split by ## or # headings
      const parts = content.split(/^(#{1,2}\s+.+)$/m);
      let currentTitle = "Untitled";
      let currentContent = "";

      for (const part of parts) {
        if (part.match(/^#{1,2}\s+/)) {
          if (currentContent.trim()) {
            detected.push({ title: currentTitle, content: currentContent.trim(), selected: true });
          }
          currentTitle = part.replace(/^#{1,2}\s+/, "").trim();
          currentContent = "";
        } else {
          currentContent += part;
        }
      }
      if (currentContent.trim()) {
        detected.push({ title: currentTitle, content: currentContent.trim(), selected: true });
      }
    } else if (method === "break") {
      // Split by scene breaks (*** / --- / ###)
      const parts = content.split(/\n(?:\*{3,}|-{3,}|#{3,})\n/);
      detected = parts
        .filter((p) => p.trim())
        .map((p, i) => ({
          title: `Chapter ${i + 1}`,
          content: p.trim(),
          selected: true,
        }));
    } else {
      // Single chapter
      detected = [{ title: "Imported Chapter", content, selected: true }];
    }

    if (detected.length === 0) {
      detected = [{ title: "Imported Chapter", content, selected: true }];
    }

    setChapters(detected);
  };

  const toggleChapter = (index: number) => {
    setChapters((prev) => prev.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleImport = async () => {
    if (!store.project) return;
    setStep("importing");

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      for (const chapter of chapters().filter((c) => c.selected)) {
        const created = await invoke("create_chapter", {
          projectPath: store.project.path,
          title: chapter.title,
          parentId: null,
        }) as any;

        await invoke("update_chapter", {
          projectPath: store.project.path,
          chapterId: created.id,
          content: chapter.content,
        });

        manuscriptStore.addNode({
          id: created.id,
          title: chapter.title,
          node_type: "chapter",
          children: [],
          status: "draft",
          word_count: chapter.content.split(/\s+/).filter(Boolean).length,
        });
      }
      setStep("done");
    } catch (e) {
      console.error("Import error:", e);
      setStep("preview");
    }
  };

  return (
    <Modal open={props.open} onClose={props.onClose} title="Import" width="600px">
      <div class="import-wizard">
        <Show when={step() === "select"}>
          <div class="import-wizard__select">
            <p class="import-wizard__desc">Import a text file into your manuscript. Chapters will be auto-detected.</p>
            <div class="import-wizard__split-options">
              <label class="import-wizard__radio">
                <input type="radio" name="split" checked={splitMethod() === "heading"} onChange={() => setSplitMethod("heading")} />
                <span>Split by headings (# or ##)</span>
              </label>
              <label class="import-wizard__radio">
                <input type="radio" name="split" checked={splitMethod() === "break"} onChange={() => setSplitMethod("break")} />
                <span>Split by scene breaks (*** / ---)</span>
              </label>
              <label class="import-wizard__radio">
                <input type="radio" name="split" checked={splitMethod() === "manual"} onChange={() => setSplitMethod("manual")} />
                <span>Import as single chapter</span>
              </label>
            </div>
            <Button variant="primary" onClick={handleFileSelect}>Choose File</Button>
          </div>
        </Show>

        <Show when={step() === "preview"}>
          <div class="import-wizard__preview">
            <p class="import-wizard__desc">{chapters().filter((c) => c.selected).length} of {chapters().length} chapters selected</p>
            <div class="import-wizard__chapter-list">
              <For each={chapters()}>
                {(chapter, index) => (
                  <label class="import-wizard__chapter-item">
                    <input type="checkbox" checked={chapter.selected} onChange={() => toggleChapter(index())} />
                    <span class="import-wizard__chapter-title">{chapter.title}</span>
                    <span class="import-wizard__chapter-words">{chapter.content.split(/\s+/).filter(Boolean).length} words</span>
                  </label>
                )}
              </For>
            </div>
            <div class="import-wizard__actions">
              <Button variant="ghost" onClick={() => setStep("select")}>Back</Button>
              <Button variant="primary" onClick={handleImport} disabled={chapters().filter((c) => c.selected).length === 0}>
                Import {chapters().filter((c) => c.selected).length} Chapters
              </Button>
            </div>
          </div>
        </Show>

        <Show when={step() === "importing"}>
          <div class="import-wizard__loading">Importing chapters...</div>
        </Show>

        <Show when={step() === "done"}>
          <div class="import-wizard__done">
            <p>Import complete!</p>
            <Button variant="primary" onClick={props.onClose}>Done</Button>
          </div>
        </Show>
      </div>

      <style>{`
        .import-wizard { display: flex; flex-direction: column; gap: var(--space-md); padding-top: var(--space-sm); }
        .import-wizard__desc { font-size: var(--font-size-sm); color: var(--color-ghost); }
        .import-wizard__split-options { display: flex; flex-direction: column; gap: var(--space-sm); }
        .import-wizard__radio {
          display: flex; align-items: center; gap: var(--space-sm);
          font-size: var(--font-size-sm); color: var(--color-ink); cursor: pointer;
        }
        .import-wizard__chapter-list {
          max-height: 300px; overflow-y: auto;
          border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm);
        }
        .import-wizard__chapter-item {
          display: flex; align-items: center; gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          font-size: var(--font-size-sm); cursor: pointer;
          border-bottom: 1px solid var(--color-border-subtle);
          transition: background var(--transition-fast);
        }
        .import-wizard__chapter-item:hover { background: var(--color-bone-dust); }
        .import-wizard__chapter-item:last-child { border-bottom: none; }
        .import-wizard__chapter-title { flex: 1; color: var(--color-ink); font-weight: 500; }
        .import-wizard__chapter-words { font-size: var(--font-size-xs); color: var(--color-ghost); font-variant-numeric: tabular-nums; }
        .import-wizard__actions { display: flex; gap: var(--space-sm); justify-content: flex-end; }
        .import-wizard__loading, .import-wizard__done {
          text-align: center; padding: var(--space-xl); color: var(--color-ghost);
          display: flex; flex-direction: column; align-items: center; gap: var(--space-md);
        }
      `}</style>
    </Modal>
  );
};
