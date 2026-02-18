import { Component, JSX, splitProps } from "solid-js";

export type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: JSX.Element;
  active?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "icon",
    "active",
    "children",
    "class",
  ]);

  const variant = () => local.variant || "ghost";
  const size = () => local.size || "md";

  return (
    <button
      class={`qb-button qb-button--${variant()} qb-button--${size()} ${local.active ? "qb-button--active" : ""} ${local.class || ""}`}
      {...rest}
    >
      {local.icon && <span class="qb-button__icon">{local.icon}</span>}
      {local.children && <span class="qb-button__label">{local.children}</span>}

      <style>{`
        .qb-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          font-family: var(--font-ui);
          font-weight: 500;
          letter-spacing: 0.01em;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color var(--transition-fast),
                      color var(--transition-fast),
                      border-color var(--transition-fast),
                      transform var(--transition-fast);
          white-space: nowrap;
          user-select: none;
          position: relative;
        }

        .qb-button:active {
          transform: scale(0.97);
        }

        .qb-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        /* Sizes */
        .qb-button--sm {
          padding: 3px var(--space-sm);
          font-size: var(--font-size-xs);
          height: 26px;
        }

        .qb-button--md {
          padding: 5px var(--space-md);
          font-size: var(--font-size-sm);
          height: 32px;
        }

        .qb-button--lg {
          padding: 8px var(--space-lg);
          font-size: var(--font-size-base);
          height: 40px;
        }

        /* Variants */
        .qb-button--primary {
          background: var(--color-ink);
          color: var(--color-bone);
          border: 1px solid var(--color-ink);
        }

        .qb-button--primary:hover:not(:disabled) {
          background: var(--color-ink-wash);
          border-color: var(--color-ink-wash);
        }

        .qb-button--ghost {
          background: transparent;
          color: var(--color-ink);
          border: 1px solid transparent;
        }

        .qb-button--ghost:hover:not(:disabled) {
          background: var(--color-bone-dust);
        }

        .qb-button--ghost.qb-button--active {
          background: var(--color-bone-dust);
          color: var(--color-accent);
        }

        .qb-button--subtle {
          background: transparent;
          color: var(--color-ghost);
          border: 1px solid transparent;
        }

        .qb-button--subtle:hover:not(:disabled) {
          color: var(--color-ink);
          background: var(--color-bone-dust);
        }

        .qb-button--danger {
          background: transparent;
          color: var(--color-status-trash);
          border: 1px solid transparent;
        }

        .qb-button--danger:hover:not(:disabled) {
          background: rgba(107, 58, 58, 0.1);
        }

        .qb-button__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .qb-button__icon svg {
          width: 100%;
          height: 100%;
        }

        .qb-button__label {
          line-height: 1;
        }
      `}</style>
    </button>
  );
};
