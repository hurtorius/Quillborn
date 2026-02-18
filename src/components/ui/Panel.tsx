import { Component, JSX, Show } from "solid-js";

interface PanelProps {
  title?: string;
  children: JSX.Element;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  actions?: JSX.Element;
  class?: string;
}

export const Panel: Component<PanelProps> = (props) => {
  return (
    <div class={`qb-panel ${props.collapsed ? "qb-panel--collapsed" : ""} ${props.class || ""}`}>
      <Show when={props.title}>
        <div class="qb-panel__header" onClick={props.collapsible ? props.onToggle : undefined}>
          {props.collapsible && (
            <span class={`qb-panel__chevron ${props.collapsed ? "" : "qb-panel__chevron--open"}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 2L7 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          )}
          <span class="qb-panel__title">{props.title}</span>
          <Show when={props.actions}>
            <div class="qb-panel__actions" onClick={(e) => e.stopPropagation()}>
              {props.actions}
            </div>
          </Show>
        </div>
      </Show>
      <Show when={!props.collapsed}>
        <div class="qb-panel__body">{props.children}</div>
      </Show>

      <style>{`
        .qb-panel {
          display: flex;
          flex-direction: column;
        }

        .qb-panel__header {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          user-select: none;
        }

        .qb-panel__header[onClick] {
          cursor: pointer;
        }

        .qb-panel__header[onClick]:hover {
          background: var(--color-bone-dust);
        }

        .qb-panel__chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          color: var(--color-ghost);
          transition: transform var(--transition-fast);
        }

        .qb-panel__chevron--open {
          transform: rotate(90deg);
        }

        .qb-panel__title {
          flex: 1;
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-ghost);
        }

        .qb-panel__actions {
          display: flex;
          gap: 2px;
        }

        .qb-panel__body {
          padding: 0 var(--space-md) var(--space-sm);
        }
      `}</style>
    </div>
  );
};
