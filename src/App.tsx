import { Component, onMount, onCleanup, createSignal } from "solid-js";
import { WindowChrome } from "@/components/chrome/WindowChrome";
import { StatusBar } from "@/components/chrome/StatusBar";
import { ManuscriptTree } from "@/components/sidebar/ManuscriptTree";
import { WritingCanvas } from "@/components/canvas/WritingCanvas";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { NewProjectModal } from "@/components/ui/NewProjectModal";
import { manuscriptStore } from "@/stores/manuscript";
import { themeStore } from "@/stores/theme";
import { keybindingStore } from "@/stores/keybindings";

const App: Component = () => {
  const [newProjectOpen, setNewProjectOpen] = createSignal(false);
  const { store } = manuscriptStore;

  onMount(() => {
    themeStore.init();
    keybindingStore.init();
    registerCommands();
  });

  onCleanup(() => {
    keybindingStore.cleanup();
  });

  const registerCommands = () => {
    keybindingStore.registerCommands([
      {
        id: "new-project",
        label: "New Manuscript",
        category: "File",
        keys: "Cmd+Shift+n",
        action: () => setNewProjectOpen(true),
      },
      {
        id: "open-project",
        label: "Open Manuscript",
        category: "File",
        keys: "Cmd+o",
        action: handleOpenProject,
      },
      {
        id: "save-snapshot",
        label: "Save Snapshot",
        category: "File",
        keys: "Cmd+s",
        action: handleSaveSnapshot,
      },
      {
        id: "new-chapter",
        label: "New Chapter",
        category: "File",
        keys: "Cmd+n",
        action: handleNewChapter,
      },
      {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        category: "View",
        keys: "Cmd+1",
        action: () => manuscriptStore.toggleSidebar(),
      },
      {
        id: "toggle-theme",
        label: "Toggle Theme (Classic/Candlelight)",
        category: "View",
        action: () => themeStore.toggleTheme(),
      },
      {
        id: "command-palette",
        label: "Command Palette",
        category: "Navigation",
        keys: "Cmd+k",
        action: () => keybindingStore.togglePalette(),
      },
      {
        id: "export-markdown",
        label: "Export as Markdown",
        category: "Export",
        action: handleExportMarkdown,
      },
      {
        id: "export-plain-text",
        label: "Export as Plain Text",
        category: "Export",
        action: handleExportPlainText,
      },
    ]);
  };

  const handleCreateProject = async (title: string, author: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { homeDir } = await import("@tauri-apps/api/path");

      const home = await homeDir();
      const dir = `${home}Documents`;

      const project = await invoke("create_project", { dir, title, author });
      manuscriptStore.setProject(project as any);
      setNewProjectOpen(false);
    } catch (e) {
      console.error("Failed to create project:", e);
      // Fallback for dev mode: create in temp
      handleCreateProjectFallback(title, author);
    }
  };

  const handleCreateProjectFallback = async (title: string, author: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const project = await invoke("create_project", {
        dir: "/tmp",
        title,
        author,
      });
      manuscriptStore.setProject(project as any);
      setNewProjectOpen(false);
    } catch (e) {
      console.error("Failed to create project (fallback):", e);
    }
  };

  const handleOpenProject = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        title: "Open Manuscript (.qb folder)",
        filters: [],
      });
      if (selected) {
        const { invoke } = await import("@tauri-apps/api/core");
        const project = await invoke("open_project", { path: selected });
        manuscriptStore.setProject(project as any);
      }
    } catch (e) {
      console.error("Failed to open project:", e);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_snapshot", {
        projectPath: store.project.path,
        name: "manual",
      });
    } catch (e) {
      console.error("Failed to save snapshot:", e);
    }
  };

  const handleNewChapter = async () => {
    if (!store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chapter = await invoke("create_chapter", {
        projectPath: store.project.path,
        title: "Untitled Chapter",
        parentId: null,
      });
      manuscriptStore.addNode({
        id: (chapter as any).id,
        title: (chapter as any).title,
        node_type: "chapter",
        children: [],
        status: "draft",
        word_count: 0,
      });
      manuscriptStore.setActiveChapter(chapter as any);
    } catch (e) {
      console.error("Failed to create chapter:", e);
    }
  };

  const handleExportMarkdown = async () => {
    if (!store.project) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await save({
        title: "Export Markdown",
        defaultPath: `${store.project.metadata.title}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (path) {
        await invoke("export_markdown", {
          projectPath: store.project.path,
          outputPath: path,
        });
      }
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const handleExportPlainText = async () => {
    if (!store.project) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await save({
        title: "Export Plain Text",
        defaultPath: `${store.project.metadata.title}.txt`,
        filters: [{ name: "Plain Text", extensions: ["txt"] }],
      });
      if (path) {
        await invoke("export_plain_text", {
          projectPath: store.project.path,
          outputPath: path,
        });
      }
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <div class="app-layout">
      <WindowChrome />
      <div class="app-body">
        <ManuscriptTree />
        <WritingCanvas />
      </div>
      <StatusBar />
      <CommandPalette />
      <NewProjectModal
        open={newProjectOpen()}
        onClose={() => setNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />
      {themeStore.grainEnabled() && <div class="paper-grain" />}
      <div class="vignette" />
    </div>
  );
};

export default App;
