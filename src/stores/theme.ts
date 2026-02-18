import { createSignal, createRoot } from "solid-js";

export type ThemeName = "classic" | "candlelight";

function createThemeStore() {
  const [theme, setTheme] = createSignal<ThemeName>(
    (localStorage.getItem("quillborn-theme") as ThemeName) || "classic"
  );

  const [accentColor, setAccentColor] = createSignal(
    localStorage.getItem("quillborn-accent") || "#8B1A1A"
  );

  const [grainEnabled, setGrainEnabled] = createSignal(
    localStorage.getItem("quillborn-grain") !== "false"
  );

  const applyTheme = (name: ThemeName) => {
    setTheme(name);
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("quillborn-theme", name);
  };

  const applyAccent = (color: string) => {
    setAccentColor(color);
    document.documentElement.style.setProperty("--color-accent", color);
    // Compute muted version
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty(
      "--color-accent-muted",
      `rgba(${r}, ${g}, ${b}, 0.15)`
    );
    document.documentElement.style.setProperty(
      "--color-selection",
      `rgba(${r}, ${g}, ${b}, 0.12)`
    );
    localStorage.setItem("quillborn-accent", color);
  };

  const toggleGrain = () => {
    const next = !grainEnabled();
    setGrainEnabled(next);
    localStorage.setItem("quillborn-grain", String(next));
  };

  const toggleTheme = () => {
    applyTheme(theme() === "classic" ? "candlelight" : "classic");
  };

  // Initialize on load
  const init = () => {
    applyTheme(theme());
    applyAccent(accentColor());
  };

  return {
    theme,
    accentColor,
    grainEnabled,
    applyTheme,
    applyAccent,
    toggleGrain,
    toggleTheme,
    init,
  };
}

export const themeStore = createRoot(createThemeStore);
