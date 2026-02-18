import { Component, JSX, createSignal, Show } from "solid-js";

interface TooltipProps {
  text: string;
  children: JSX.Element;
  position?: "top" | "bottom" | "left" | "right";
  keys?: string;
}

export const Tooltip: Component<TooltipProps> = (props) => {
  const [visible, setVisible] = createSignal(false);
  let timeout: number | undefined;

  const show = () => {
    timeout = window.setTimeout(() => setVisible(true), 500);
  };

  const hide = () => {
    clearTimeout(timeout);
    setVisible(false);
  };

  const pos = () => props.position || "bottom";

  return (
    <div
      class="qb-tooltip-trigger"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusIn={show}
      onFocusOut={hide}
    >
      {props.children}
      <Show when={visible()}>
        <div class={`qb-tooltip qb-tooltip--${pos()} anim-surface-below`} role="tooltip">
          <span>{props.text}</span>
          {props.keys && <kbd class="qb-tooltip__keys">{props.keys}</kbd>}
        </div>
      </Show>

      <style>{`
        .qb-tooltip-trigger {
          position: relative;
          display: inline-flex;
        }

        .qb-tooltip {
          position: absolute;
          padding: 4px var(--space-sm);
          background: var(--color-ink);
          color: var(--color-bone);
          font-size: var(--font-size-xs);
          font-family: var(--font-ui);
          border-radius: var(--radius-sm);
          white-space: nowrap;
          pointer-events: none;
          z-index: var(--z-tooltip);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          box-shadow: var(--shadow-md);
        }

        .qb-tooltip--bottom {
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
        }

        .qb-tooltip--top {
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
        }

        .qb-tooltip--left {
          right: calc(100% + 6px);
          top: 50%;
          transform: translateY(-50%);
        }

        .qb-tooltip--right {
          left: calc(100% + 6px);
          top: 50%;
          transform: translateY(-50%);
        }

        .qb-tooltip__keys {
          font-size: 10px;
          padding: 1px 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          font-family: var(--font-ui);
        }
      `}</style>
    </div>
  );
};
