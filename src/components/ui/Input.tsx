import { Component, JSX, splitProps } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ["label", "error", "class"]);

  return (
    <div class={`qb-input-wrapper ${local.error ? "qb-input-wrapper--error" : ""} ${local.class || ""}`}>
      {local.label && <label class="qb-input-label">{local.label}</label>}
      <input class="qb-input" {...rest} />
      {local.error && <span class="qb-input-error">{local.error}</span>}

      <style>{`
        .qb-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .qb-input-label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }

        .qb-input {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-sm) 0;
          transition: border-color var(--transition-fast);
          width: 100%;
        }

        .qb-input:focus {
          border-bottom-color: var(--color-accent);
        }

        .qb-input::placeholder {
          color: var(--color-ghost);
        }

        .qb-input-wrapper--error .qb-input {
          border-bottom-color: var(--color-status-trash);
        }

        .qb-input-error {
          font-size: var(--font-size-xs);
          color: var(--color-status-trash);
        }
      `}</style>
    </div>
  );
};
