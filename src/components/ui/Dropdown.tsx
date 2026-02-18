import { Component, JSX, For, Show, createSignal, onMount, onCleanup } from "solid-js";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: JSX.Element;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  onSelect: (id: string) => void;
  trigger: JSX.Element;
  align?: "left" | "right";
}

export const Dropdown: Component<DropdownProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <div ref={containerRef} class="qb-dropdown">
      <div onClick={() => setOpen(!open())}>{props.trigger}</div>
      <Show when={open()}>
        <div class={`qb-dropdown__menu anim-surface-below ${props.align === "right" ? "qb-dropdown__menu--right" : ""}`}>
          <For each={props.items}>
            {(item) =>
              item.separator ? (
                <div class="qb-dropdown__separator" />
              ) : (
                <button
                  class={`qb-dropdown__item ${item.danger ? "qb-dropdown__item--danger" : ""}`}
                  onClick={() => {
                    props.onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  {item.icon && <span class="qb-dropdown__icon">{item.icon}</span>}
                  <span class="qb-dropdown__label">{item.label}</span>
                  {item.shortcut && <span class="qb-dropdown__shortcut">{item.shortcut}</span>}
                </button>
              )
            }
          </For>
        </div>
      </Show>

      <style>{`
        .qb-dropdown {
          position: relative;
          display: inline-flex;
        }

        .qb-dropdown__menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 180px;
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: var(--z-modal);
          padding: var(--space-xs) 0;
          overflow: hidden;
        }

        .qb-dropdown__menu--right {
          left: auto;
          right: 0;
        }

        .qb-dropdown__item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          transition: background var(--transition-fast);
          text-align: left;
        }

        .qb-dropdown__item:hover {
          background: var(--color-bone-dust);
        }

        .qb-dropdown__item--danger {
          color: var(--color-status-trash);
        }

        .qb-dropdown__item--danger:hover {
          background: rgba(107, 58, 58, 0.08);
        }

        .qb-dropdown__icon {
          display: flex;
          width: 14px;
          height: 14px;
          opacity: 0.6;
        }

        .qb-dropdown__label {
          flex: 1;
        }

        .qb-dropdown__shortcut {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-family: var(--font-ui);
        }

        .qb-dropdown__separator {
          height: 1px;
          background: var(--color-border-subtle);
          margin: var(--space-xs) 0;
        }
      `}</style>
    </div>
  );
};
