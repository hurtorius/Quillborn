import { Component, For, Show, createSignal, createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { QuillbornPlugin, PluginRegistry } from "@/plugins/types";

function createPluginRegistry(): PluginRegistry {
  const [plugins, setPlugins] = createStore<QuillbornPlugin[]>([]);

  const register = (plugin: QuillbornPlugin) => {
    // Prevent duplicate registration
    const existing = plugins.find((p) => p.id === plugin.id);
    if (existing) return;

    setPlugins(
      produce((draft) => {
        draft.push({ ...plugin });
      })
    );

    if (plugin.enabled && plugin.onActivate) {
      plugin.onActivate();
    }
  };

  const unregister = (pluginId: string) => {
    const plugin = plugins.find((p) => p.id === pluginId);
    if (plugin?.enabled && plugin.onDeactivate) {
      plugin.onDeactivate();
    }
    setPlugins(
      produce((draft) => {
        const idx = draft.findIndex((p) => p.id === pluginId);
        if (idx !== -1) draft.splice(idx, 1);
      })
    );
  };

  const toggle = (pluginId: string) => {
    setPlugins(
      produce((draft) => {
        const plugin = draft.find((p) => p.id === pluginId);
        if (!plugin) return;
        plugin.enabled = !plugin.enabled;
        if (plugin.enabled) {
          plugin.onActivate?.();
        } else {
          plugin.onDeactivate?.();
        }
      })
    );
  };

  const getPlugin = (pluginId: string): QuillbornPlugin | undefined => {
    return plugins.find((p) => p.id === pluginId);
  };

  return {
    get plugins() {
      return plugins;
    },
    register,
    unregister,
    toggle,
    getPlugin,
  };
}

export const pluginRegistry = createRoot(createPluginRegistry);

export const PluginManager: Component = () => {
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Panel title="Plugins">
      <div class="plugin-manager">
        <Show
          when={pluginRegistry.plugins.length > 0}
          fallback={
            <div class="plugin-manager__empty">
              <p class="plugin-manager__empty-text">No plugins installed.</p>
              <p class="plugin-manager__empty-hint">
                Plugins extend Quillborn with custom commands, panels, and features.
              </p>
            </div>
          }
        >
          <div class="plugin-manager__list">
            <For each={pluginRegistry.plugins}>
              {(plugin) => (
                <div
                  class={`plugin-manager__item ${plugin.enabled ? "plugin-manager__item--enabled" : ""}`}
                >
                  <div
                    class="plugin-manager__item-header"
                    onClick={() => toggleExpanded(plugin.id)}
                  >
                    <div class="plugin-manager__item-info">
                      <span class="plugin-manager__item-name">{plugin.name}</span>
                      <span class="plugin-manager__item-version">v{plugin.version}</span>
                    </div>
                    <button
                      class={`plugin-manager__toggle ${plugin.enabled ? "plugin-manager__toggle--on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        pluginRegistry.toggle(plugin.id);
                      }}
                      title={plugin.enabled ? "Disable plugin" : "Enable plugin"}
                    >
                      <div class="plugin-manager__toggle-track">
                        <div class="plugin-manager__toggle-thumb" />
                      </div>
                    </button>
                  </div>

                  <Show when={expandedId() === plugin.id}>
                    <div class="plugin-manager__item-details">
                      <p class="plugin-manager__item-description">{plugin.description}</p>
                      <div class="plugin-manager__item-meta">
                        <span>by {plugin.author}</span>
                        <Show when={plugin.commands && plugin.commands.length > 0}>
                          <span>{plugin.commands!.length} command{plugin.commands!.length !== 1 ? "s" : ""}</span>
                        </Show>
                        <Show when={plugin.panels && plugin.panels.length > 0}>
                          <span>{plugin.panels!.length} panel{plugin.panels!.length !== 1 ? "s" : ""}</span>
                        </Show>
                      </div>

                      <Show when={plugin.commands && plugin.commands.length > 0}>
                        <div class="plugin-manager__commands">
                          <span class="plugin-manager__commands-label">Commands:</span>
                          <For each={plugin.commands}>
                            {(cmd) => (
                              <button
                                class="plugin-manager__command-btn"
                                onClick={() => cmd.action()}
                                disabled={!plugin.enabled}
                              >
                                {cmd.label}
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>

                      <div class="plugin-manager__item-actions">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => pluginRegistry.unregister(plugin.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>

        <div class="plugin-manager__footer">
          <span class="plugin-manager__count">
            {pluginRegistry.plugins.length} plugin{pluginRegistry.plugins.length !== 1 ? "s" : ""} installed
          </span>
        </div>
      </div>

      <style>{`
        .plugin-manager {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding: var(--space-md) 0;
        }

        .plugin-manager__empty {
          text-align: center;
          padding: var(--space-xl) var(--space-md);
        }

        .plugin-manager__empty-text {
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          margin-bottom: var(--space-xs);
        }

        .plugin-manager__empty-hint {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .plugin-manager__list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .plugin-manager__item {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color var(--transition-fast);
        }

        .plugin-manager__item--enabled {
          border-color: var(--color-border);
        }

        .plugin-manager__item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .plugin-manager__item-header:hover {
          background: var(--color-bone-dust);
        }

        .plugin-manager__item-info {
          display: flex;
          align-items: baseline;
          gap: var(--space-sm);
        }

        .plugin-manager__item-name {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-ink);
        }

        .plugin-manager__item-version {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-family: var(--font-mono);
        }

        .plugin-manager__toggle {
          position: relative;
          cursor: pointer;
          padding: 0;
          background: none;
          border: none;
        }

        .plugin-manager__toggle-track {
          width: 36px;
          height: 20px;
          background: var(--color-bone-dust);
          border-radius: 10px;
          border: 1px solid var(--color-border);
          transition: background var(--transition-fast), border-color var(--transition-fast);
          position: relative;
        }

        .plugin-manager__toggle--on .plugin-manager__toggle-track {
          background: var(--color-accent-muted);
          border-color: var(--color-accent);
        }

        .plugin-manager__toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-ghost);
          transition: transform var(--transition-fast), background var(--transition-fast);
        }

        .plugin-manager__toggle--on .plugin-manager__toggle-thumb {
          transform: translateX(16px);
          background: var(--color-accent);
        }

        .plugin-manager__item-details {
          padding: 0 var(--space-md) var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          border-top: 1px solid var(--color-border-subtle);
        }

        .plugin-manager__item-description {
          font-size: var(--font-size-xs);
          color: var(--color-ink-wash);
          line-height: 1.5;
          padding-top: var(--space-sm);
        }

        .plugin-manager__item-meta {
          display: flex;
          gap: var(--space-md);
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }

        .plugin-manager__commands {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--space-xs);
        }

        .plugin-manager__commands-label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-weight: 500;
        }

        .plugin-manager__command-btn {
          font-family: var(--font-ui);
          font-size: var(--font-size-xs);
          color: var(--color-ink);
          background: var(--color-bone-dust);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          padding: 2px var(--space-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .plugin-manager__command-btn:hover:not(:disabled) {
          background: var(--color-accent-muted);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .plugin-manager__command-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .plugin-manager__item-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: var(--space-xs);
        }

        .plugin-manager__footer {
          display: flex;
          justify-content: center;
          padding-top: var(--space-sm);
          border-top: 1px solid var(--color-border-subtle);
        }

        .plugin-manager__count {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }
      `}</style>
    </Panel>
  );
};
