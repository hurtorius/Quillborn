import { Component, createSignal, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";

interface BindingRitualProps {
  title: string;
  format: string;
  onComplete: () => void;
}

export const BindingRitual: Component<BindingRitualProps> = (props) => {
  const [phase, setPhase] = createSignal<"fold" | "seal" | "done">("fold");

  onMount(() => {
    // Phase 1: Folding (1.5s)
    setTimeout(() => setPhase("seal"), 1500);
    // Phase 2: Seal (1.5s)
    setTimeout(() => setPhase("done"), 3000);
    // Complete (0.5s after done)
    setTimeout(() => props.onComplete(), 3500);
  });

  return (
    <Portal>
      <div class="binding-ritual">
        <div class="binding-ritual__backdrop" />

        <div class="binding-ritual__content">
          <Show when={phase() === "fold"}>
            <div class="binding-ritual__fold anim-scale-in">
              <div class="binding-ritual__manuscript">
                <div class="binding-ritual__page binding-ritual__page--left" />
                <div class="binding-ritual__page binding-ritual__page--right" />
              </div>
              <p class="binding-ritual__text">Binding manuscript...</p>
            </div>
          </Show>

          <Show when={phase() === "seal"}>
            <div class="binding-ritual__seal anim-scale-in">
              <div class="binding-ritual__wax">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="28" fill="var(--color-accent)" opacity="0.9"/>
                  <circle cx="32" cy="32" r="20" stroke="var(--color-bone)" stroke-width="1.5" fill="none" opacity="0.5"/>
                  <text x="32" y="37" text-anchor="middle" font-size="16" fill="var(--color-bone)" font-family="var(--font-display)" font-weight="600">Q</text>
                </svg>
              </div>
              <p class="binding-ritual__text">Sealing with wax...</p>
            </div>
          </Show>

          <Show when={phase() === "done"}>
            <div class="binding-ritual__done anim-ink-dissolve-in">
              <p class="binding-ritual__title">{props.title}</p>
              <p class="binding-ritual__format">Exported as {props.format.toUpperCase()}</p>
            </div>
          </Show>
        </div>

        <style>{`
          .binding-ritual {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .binding-ritual__backdrop {
            position: absolute;
            inset: 0;
            background: var(--color-surface-overlay);
            animation: fade-in 300ms ease both;
          }
          .binding-ritual__content {
            position: relative;
            z-index: 1;
            text-align: center;
          }
          .binding-ritual__fold, .binding-ritual__seal, .binding-ritual__done {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-lg);
          }
          .binding-ritual__manuscript {
            display: flex;
            perspective: 600px;
          }
          .binding-ritual__page {
            width: 80px;
            height: 110px;
            background: var(--color-bone);
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-md);
          }
          .binding-ritual__page--left {
            transform-origin: right center;
            animation: page-fold-left 1.2s ease both;
          }
          .binding-ritual__page--right {
            transform-origin: left center;
            animation: page-fold-right 1.2s ease 0.3s both;
          }
          @keyframes page-fold-left {
            from { transform: rotateY(0); }
            to { transform: rotateY(-80deg); }
          }
          @keyframes page-fold-right {
            from { transform: rotateY(0); }
            to { transform: rotateY(80deg); }
          }
          .binding-ritual__wax {
            animation: ink-bloom 1s ease both;
          }
          .binding-ritual__text {
            font-family: var(--font-display);
            font-size: var(--font-size-base);
            color: var(--color-bone);
            font-style: italic;
            opacity: 0.8;
          }
          .binding-ritual__title {
            font-family: var(--font-display);
            font-size: var(--font-size-2xl);
            color: var(--color-bone);
            font-weight: 400;
          }
          .binding-ritual__format {
            font-size: var(--font-size-sm);
            color: var(--color-ghost);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
        `}</style>
      </div>
    </Portal>
  );
};
