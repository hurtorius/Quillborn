import { Component, JSX, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  width?: string;
}

export const Modal: Component<ModalProps> = (props) => {
  let backdropRef: HTMLDivElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === backdropRef) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div
          ref={backdropRef}
          class="qb-modal-backdrop anim-fade-in"
          onClick={handleBackdropClick}
        >
          <div
            class="qb-modal anim-scale-in"
            style={{ "max-width": props.width || "480px" }}
            role="dialog"
            aria-modal="true"
          >
            {props.title && (
              <div class="qb-modal__header">
                <h2 class="qb-modal__title">{props.title}</h2>
                <button class="qb-modal__close" onClick={props.onClose}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            )}
            <div class="qb-modal__body">{props.children}</div>
          </div>
        </div>

        <style>{`
          .qb-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--color-surface-overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: var(--z-modal);
            padding: var(--space-xl);
          }

          .qb-modal {
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-overlay);
            width: 100%;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .qb-modal__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-lg) var(--space-lg) var(--space-md);
          }

          .qb-modal__title {
            font-family: var(--font-display);
            font-size: var(--font-size-xl);
            font-weight: 600;
            color: var(--color-ink);
            line-height: 1.2;
          }

          .qb-modal__close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: var(--radius-sm);
            color: var(--color-ghost);
            transition: color var(--transition-fast), background var(--transition-fast);
          }

          .qb-modal__close:hover {
            color: var(--color-ink);
            background: var(--color-bone-dust);
          }

          .qb-modal__body {
            padding: 0 var(--space-lg) var(--space-lg);
            overflow-y: auto;
          }
        `}</style>
      </Portal>
    </Show>
  );
};
