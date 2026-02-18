import { createSignal, createRoot } from "solid-js";

export interface KeyBinding {
  id: string;
  label: string;
  keys: string;
  action: () => void;
  category: "navigation" | "editing" | "view" | "export" | "tools" | "settings";
}

export interface Command {
  id: string;
  label: string;
  category: string;
  keys?: string;
  action: () => void;
}

function createKeybindingStore() {
  const [commands, setCommands] = createSignal<Command[]>([]);
  const [paletteOpen, setPaletteOpen] = createSignal(false);

  const registerCommand = (cmd: Command) => {
    setCommands((prev) => {
      const filtered = prev.filter((c) => c.id !== cmd.id);
      return [...filtered, cmd];
    });
  };

  const registerCommands = (cmds: Command[]) => {
    setCommands((prev) => {
      const ids = new Set(cmds.map((c) => c.id));
      const filtered = prev.filter((c) => !ids.has(c.id));
      return [...filtered, ...cmds];
    });
  };

  const executeCommand = (id: string) => {
    const cmd = commands().find((c) => c.id === id);
    if (cmd) {
      cmd.action();
      setPaletteOpen(false);
    }
  };

  const togglePalette = () => {
    setPaletteOpen((prev) => !prev);
  };

  const openPalette = () => setPaletteOpen(true);
  const closePalette = () => setPaletteOpen(false);

  // Global keyboard listener
  const handleKeyDown = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    const shift = e.shiftKey;

    // Command palette: Cmd+K
    if (meta && e.key === "k") {
      e.preventDefault();
      togglePalette();
      return;
    }

    // Escape closes palette
    if (e.key === "Escape" && paletteOpen()) {
      e.preventDefault();
      closePalette();
      return;
    }

    // Match keybindings
    for (const cmd of commands()) {
      if (!cmd.keys) continue;
      const parts = cmd.keys.toLowerCase().split("+");
      const needsMeta = parts.includes("cmd") || parts.includes("ctrl");
      const needsShift = parts.includes("shift");
      const key = parts[parts.length - 1];

      if (
        meta === needsMeta &&
        shift === needsShift &&
        e.key.toLowerCase() === key
      ) {
        e.preventDefault();
        cmd.action();
        return;
      }
    }
  };

  const init = () => {
    window.addEventListener("keydown", handleKeyDown);
  };

  const cleanup = () => {
    window.removeEventListener("keydown", handleKeyDown);
  };

  return {
    commands,
    paletteOpen,
    registerCommand,
    registerCommands,
    executeCommand,
    togglePalette,
    openPalette,
    closePalette,
    init,
    cleanup,
  };
}

export const keybindingStore = createRoot(createKeybindingStore);
