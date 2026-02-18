export interface QuillbornPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  commands?: { id: string; label: string; action: () => void }[];
  panels?: { id: string; title: string; component: () => any }[];
}

export interface PluginRegistry {
  plugins: QuillbornPlugin[];
  register: (plugin: QuillbornPlugin) => void;
  unregister: (pluginId: string) => void;
  toggle: (pluginId: string) => void;
  getPlugin: (pluginId: string) => QuillbornPlugin | undefined;
}
