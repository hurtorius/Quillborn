import { Component, Show, onMount, onCleanup, createSignal } from "solid-js";
import { WindowChrome } from "@/components/chrome/WindowChrome";
import { StatusBar } from "@/components/chrome/StatusBar";
import { ManuscriptTree } from "@/components/sidebar/ManuscriptTree";
import { ContextPanel } from "@/components/sidebar/ContextPanel";
import { WritingCanvas } from "@/components/canvas/WritingCanvas";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { NewProjectModal } from "@/components/ui/NewProjectModal";
import { CorkboardView } from "@/components/planning/CorkboardView";
import { OutlineView } from "@/components/planning/OutlineView";
import { CharacterSheets } from "@/components/characters/CharacterSheets";
import { WikiView } from "@/components/wiki/WikiView";
import { TimelineView } from "@/components/timeline/TimelineView";
import { ConstellationMap } from "@/components/constellation/ConstellationMap";
import { ImportWizard } from "@/components/import/ImportWizard";
import { BindingRitual } from "@/components/export/BindingRitual";
import { ManuscriptHeartbeat } from "@/components/heartbeat/ManuscriptHeartbeat";
import { manuscriptStore } from "@/stores/manuscript";
import { themeStore } from "@/stores/theme";
import { keybindingStore } from "@/stores/keybindings";
import { writingStore } from "@/stores/writing";
import { planningStore } from "@/stores/planning";

type ViewMode = "canvas" | "corkboard" | "outline" | "characters" | "wiki" | "timeline" | "constellation";

const MOODS = ["tension", "grief", "joy", "dread", "calm", "chaos", "romance", "mystery", "action", "reflection"];

const App: Component = () => {
  const [newProjectOpen, setNewProjectOpen] = createSignal(false);
  const [importOpen, setImportOpen] = createSignal(false);
  const [bindingRitual, setBindingRitual] = createSignal<{ title: string; format: string } | null>(null);
  const [viewMode, setViewMode] = createSignal<ViewMode>("canvas");
  const { store } = manuscriptStore;

  onMount(() => {
    themeStore.init();
    keybindingStore.init();
    writingStore.startSession();
    registerCommands();
  });

  onCleanup(() => {
    keybindingStore.cleanup();
  });

  const registerCommands = () => {
    keybindingStore.registerCommands([
      // === File ===
      { id: "new-project", label: "New Manuscript", category: "File", keys: "Cmd+Shift+n", action: () => setNewProjectOpen(true) },
      { id: "open-project", label: "Open Manuscript", category: "File", keys: "Cmd+o", action: handleOpenProject },
      { id: "save-snapshot", label: "Save Snapshot", category: "File", keys: "Cmd+s", action: handleSaveSnapshot },
      { id: "new-chapter", label: "New Chapter", category: "File", keys: "Cmd+n", action: handleNewChapter },
      { id: "import", label: "Import File", category: "File", action: () => setImportOpen(true) },

      // === View ===
      { id: "toggle-sidebar", label: "Toggle Sidebar", category: "View", keys: "Cmd+1", action: () => manuscriptStore.toggleSidebar() },
      { id: "toggle-canvas", label: "Canvas View", category: "View", keys: "Cmd+2", action: () => setViewMode("canvas") },
      { id: "toggle-context", label: "Toggle Context Panel", category: "View", keys: "Cmd+3", action: () => manuscriptStore.toggleContextPanel() },
      { id: "toggle-theme", label: "Toggle Theme (Classic/Candlelight)", category: "View", action: () => themeStore.toggleTheme() },

      // === Writing Modes ===
      { id: "focus-cycle", label: "Cycle Focus Mode", category: "Writing", keys: "Cmd+.", action: () => writingStore.cycleFocusMode() },
      { id: "distraction-free", label: "Distraction-Free Mode", category: "Writing", keys: "Cmd+d", action: () => writingStore.setFocusMode(writingStore.focusMode() === "distraction-free" ? "off" : "distraction-free") },
      { id: "typewriter-mode", label: "Toggle Typewriter Scroll", category: "Writing", action: () => writingStore.toggleTypewriter() },
      { id: "unwriting-mode", label: "Toggle Unwriting Mode", category: "Writing", keys: "Cmd+Shift+d", action: () => writingStore.toggleUnwriting() },
      { id: "palimpsest", label: "Toggle Palimpsest Layer", category: "Writing", keys: "Cmd+/", action: () => writingStore.togglePalimpsest() },
      { id: "find-replace", label: "Find & Replace", category: "Editing", keys: "Cmd+f", action: () => writingStore.toggleFindReplace() },
      { id: "find-manuscript", label: "Find in Manuscript", category: "Editing", keys: "Cmd+Shift+f", action: () => writingStore.toggleFindReplace() },

      // === Planning Views ===
      { id: "view-corkboard", label: "Corkboard View", category: "Planning", keys: "Cmd+Shift+b", action: () => setViewMode(viewMode() === "corkboard" ? "canvas" : "corkboard") },
      { id: "view-outline", label: "Outline View", category: "Planning", keys: "Cmd+Shift+o", action: () => setViewMode(viewMode() === "outline" ? "canvas" : "outline") },
      { id: "view-characters", label: "Character Sheets", category: "Planning", action: () => setViewMode(viewMode() === "characters" ? "canvas" : "characters") },
      { id: "view-wiki", label: "World-Building Wiki", category: "Planning", action: () => setViewMode(viewMode() === "wiki" ? "canvas" : "wiki") },
      { id: "view-timeline", label: "Timeline", category: "Planning", keys: "Cmd+Shift+t", action: () => setViewMode(viewMode() === "timeline" ? "canvas" : "timeline") },
      { id: "view-constellation", label: "Constellation Map", category: "Planning", keys: "Cmd+Shift+c", action: () => setViewMode(viewMode() === "constellation" ? "canvas" : "constellation") },

      // === Mood ===
      { id: "set-mood", label: "Set Chapter Mood", category: "Writing", keys: "Cmd+j", action: () => cycleMood() },
      { id: "ghost-note", label: "Leave Ghost Note", category: "Writing", keys: "Cmd+Shift+g", action: () => {} },

      // === Export ===
      { id: "export-markdown", label: "Export as Markdown", category: "Export", action: () => handleExport("markdown") },
      { id: "export-plain-text", label: "Export as Plain Text", category: "Export", action: () => handleExport("txt") },

      // === Navigation ===
      { id: "command-palette", label: "Command Palette", category: "Navigation", keys: "Cmd+k", action: () => keybindingStore.togglePalette() },
      { id: "quick-switch", label: "Quick Chapter Switch", category: "Navigation", keys: "Cmd+p", action: () => keybindingStore.openPalette() },
    ]);
  };

  const cycleMood = () => {
    const current = writingStore.chapterMood();
    const idx = current ? MOODS.indexOf(current) : -1;
    const next = MOODS[(idx + 1) % MOODS.length];
    writingStore.setChapterMood(next);
  };

  // === File Handlers ===
  const handleCreateProject = async (title: string, author: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { homeDir } = await import("@tauri-apps/api/path");
      const home = await homeDir();
      const dir = `${home}Documents`;
      const project = await invoke("create_project", { dir, title, author });
      manuscriptStore.setProject(project as any);
      setNewProjectOpen(false);
    } catch {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const project = await invoke("create_project", { dir: "/tmp", title, author });
        manuscriptStore.setProject(project as any);
        setNewProjectOpen(false);
      } catch (e) {
        console.error("Failed to create project:", e);
      }
    }
  };

  const handleOpenProject = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, title: "Open Manuscript (.qb folder)" });
      if (selected) {
        const { invoke } = await import("@tauri-apps/api/core");
        const project = await invoke("open_project", { path: selected });
        manuscriptStore.setProject(project as any);
      }
    } catch (e) { console.error("Failed to open project:", e); }
  };

  const handleSaveSnapshot = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_snapshot", { projectPath: store.project.path, name: "manual" });
    } catch (e) { console.error("Failed to save snapshot:", e); }
  };

  const handleNewChapter = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chapter = await invoke("create_chapter", { projectPath: store.project.path, title: "Untitled Chapter", parentId: null });
      manuscriptStore.addNode({ id: (chapter as any).id, title: (chapter as any).title, node_type: "chapter", children: [], status: "draft", word_count: 0 });
      manuscriptStore.setActiveChapter(chapter as any);
      setViewMode("canvas");
    } catch (e) { console.error("Failed to create chapter:", e); }
  };

  const handleExport = async (format: "markdown" | "txt") => {
    if (!store.project) return;
    const ext = format === "markdown" ? "md" : "txt";
    const cmd = format === "markdown" ? "export_markdown" : "export_plain_text";
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await save({
        title: `Export ${format === "markdown" ? "Markdown" : "Plain Text"}`,
        defaultPath: `${store.project.metadata.title}.${ext}`,
        filters: [{ name: format === "markdown" ? "Markdown" : "Plain Text", extensions: [ext] }],
      });
      if (path) {
        setBindingRitual({ title: store.project.metadata.title, format: ext });
        setTimeout(async () => {
          await invoke(cmd, { projectPath: store.project!.path, outputPath: path });
        }, 100);
      }
    } catch (e) { console.error("Export failed:", e); }
  };

  // === View Rendering ===
  const renderMainView = () => {
    switch (viewMode()) {
      case "corkboard": return <CorkboardView />;
      case "outline": return <OutlineView />;
      case "characters": return <CharacterSheets />;
      case "wiki": return <WikiView />;
      case "timeline": return <TimelineView />;
      case "constellation": return <ConstellationMap />;
      default: return <WritingCanvas />;
    }
  };

  return (
    <div class="app-layout">
      <WindowChrome />
      <div class="app-body">
        <ManuscriptTree />
        {renderMainView()}
        <ContextPanel />
      </div>
      <div class="status-bar-row">
        <ManuscriptHeartbeat />
        <StatusBar />
      </div>
      <CommandPalette />
      <NewProjectModal open={newProjectOpen()} onClose={() => setNewProjectOpen(false)} onCreate={handleCreateProject} />
      <ImportWizard open={importOpen()} onClose={() => setImportOpen(false)} />
      <Show when={bindingRitual()}>
        <BindingRitual
          title={bindingRitual()!.title}
          format={bindingRitual()!.format}
          onComplete={() => setBindingRitual(null)}
        />
      </Show>
      {themeStore.grainEnabled() && <div class="paper-grain" />}
      <div class="vignette" />
    </div>
  );
};

export default App;
