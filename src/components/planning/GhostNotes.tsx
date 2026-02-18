import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { planningStore, GhostNote, GhostNoteTrigger } from "@/stores/planning";
import { manuscriptStore } from "@/stores/manuscript";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export const GhostNotesPanel: Component = () => {
  const { store } = manuscriptStore;
  const [createOpen, setCreateOpen] = createSignal(false);

  const activeNotes = createMemo(() => {
    return Object.values(planningStore.ghostNotes).filter(
      (n) => !n.dismissed && n.chapterId === store.activeChapterId
    );
  });

  const revealedNotes = createMemo(() =>
    activeNotes().filter((n) => n.revealed)
  );

  const pendingNotes = createMemo(() =>
    activeNotes().filter((n) => !n.revealed)
  );

  // Check triggers
  const checkTrigger = (note: GhostNote): boolean => {
    const trigger = note.trigger;
    switch (trigger.type) {
      case "manual": return true;
      case "date": return new Date() >= new Date(trigger.date);
      case "word_count": return (store.project?.total_word_count || 0) >= trigger.count;
      default: return false;
    }
  };

  // Auto-reveal notes whose triggers have fired
  createMemo(() => {
    for (const note of pendingNotes()) {
      if (checkTrigger(note)) {
        planningStore.revealGhostNote(note.id);
      }
    }
  });

  return (
    <div class="ghost-notes-panel">
      <div class="ghost-notes-panel__header">
        <span class="ghost-notes-panel__title">Ghost Notes</span>
        <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)}>+ Leave Note</Button>
      </div>

      <Show when={revealedNotes().length > 0}>
        <div class="ghost-notes-panel__revealed">
          <For each={revealedNotes()}>
            {(note) => (
              <div class="ghost-note ghost-note--revealed anim-surface-below">
                <div class="ghost-note__icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1"/>
                    <path d="M2 6L8 9L14 6" stroke="currentColor" stroke-width="1"/>
                  </svg>
                </div>
                <div class="ghost-note__content">
                  <p class="ghost-note__message">{note.message}</p>
                  <span class="ghost-note__date">
                    Left {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button class="ghost-note__dismiss" onClick={() => planningStore.dismissGhostNote(note.id)}>
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={pendingNotes().length > 0}>
        <div class="ghost-notes-panel__pending">
          <span class="ghost-notes-panel__pending-label">{pendingNotes().length} sealed note{pendingNotes().length !== 1 ? "s" : ""}</span>
        </div>
      </Show>

      <Show when={activeNotes().length === 0}>
        <div class="ghost-notes-panel__empty">
          No ghost notes for this chapter.
        </div>
      </Show>

      <Show when={createOpen()}>
        <CreateGhostNoteModal
          chapterId={store.activeChapterId!}
          onClose={() => setCreateOpen(false)}
        />
      </Show>

      <style>{`
        .ghost-notes-panel {
          padding: var(--space-sm) 0;
        }
        .ghost-notes-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-md) var(--space-sm);
        }
        .ghost-notes-panel__title {
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-ghost);
        }
        .ghost-notes-panel__revealed {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: 0 var(--space-md);
        }
        .ghost-note {
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-sm);
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
        }
        .ghost-note--revealed {
          border-color: var(--color-accent);
          border-style: dashed;
        }
        .ghost-note__icon {
          color: var(--color-accent);
          flex-shrink: 0;
          padding-top: 2px;
        }
        .ghost-note__content { flex: 1; min-width: 0; }
        .ghost-note__message {
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          font-style: italic;
          line-height: 1.4;
        }
        .ghost-note__date {
          font-size: 10px;
          color: var(--color-ghost);
          margin-top: 2px;
          display: block;
        }
        .ghost-note__dismiss {
          color: var(--color-ghost);
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
        }
        .ghost-note__dismiss:hover { background: var(--color-bone-dust); color: var(--color-ink); }
        .ghost-notes-panel__pending {
          padding: var(--space-sm) var(--space-md);
          text-align: center;
        }
        .ghost-notes-panel__pending-label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          font-style: italic;
        }
        .ghost-notes-panel__empty {
          padding: var(--space-md);
          text-align: center;
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
        }
      `}</style>
    </div>
  );
};

const CreateGhostNoteModal: Component<{ chapterId: string; onClose: () => void }> = (props) => {
  const [message, setMessage] = createSignal("");
  const [triggerType, setTriggerType] = createSignal<"manual" | "date" | "word_count">("manual");
  const [triggerDate, setTriggerDate] = createSignal("");
  const [triggerWordCount, setTriggerWordCount] = createSignal(50000);

  const handleCreate = () => {
    if (!message().trim()) return;
    let trigger: GhostNoteTrigger;
    switch (triggerType()) {
      case "date": trigger = { type: "date", date: triggerDate() }; break;
      case "word_count": trigger = { type: "word_count", count: triggerWordCount() }; break;
      default: trigger = { type: "manual" };
    }
    planningStore.addGhostNote({
      id: crypto.randomUUID(),
      chapterId: props.chapterId,
      message: message(),
      trigger,
      revealed: false,
      dismissed: false,
      createdAt: Date.now(),
    });
    props.onClose();
  };

  return (
    <Modal open={true} onClose={props.onClose} title="Leave a Ghost Note" width="420px">
      <div class="ghost-note-form">
        <div class="ghost-note-form__field">
          <label class="ghost-note-form__label">Message to future you</label>
          <textarea
            class="ghost-note-form__textarea"
            value={message()}
            onInput={(e) => setMessage(e.currentTarget.value)}
            placeholder="Write something your future self will read..."
            rows={4}
          />
        </div>
        <div class="ghost-note-form__field">
          <label class="ghost-note-form__label">Trigger</label>
          <select
            class="ghost-note-form__select"
            value={triggerType()}
            onChange={(e) => setTriggerType(e.currentTarget.value as any)}
          >
            <option value="manual">Next time I open this chapter</option>
            <option value="date">On a specific date</option>
            <option value="word_count">When manuscript exceeds word count</option>
          </select>
        </div>
        <Show when={triggerType() === "date"}>
          <Input label="Date" type="date" value={triggerDate()} onInput={(e) => setTriggerDate(e.currentTarget.value)} />
        </Show>
        <Show when={triggerType() === "word_count"}>
          <Input label="Word count threshold" type="number" value={String(triggerWordCount())} onInput={(e) => setTriggerWordCount(parseInt(e.currentTarget.value) || 0)} />
        </Show>
        <div class="ghost-note-form__actions">
          <Button variant="ghost" onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!message().trim()}>Seal Note</Button>
        </div>
      </div>
      <style>{`
        .ghost-note-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding-top: var(--space-sm);
        }
        .ghost-note-form__field { display: flex; flex-direction: column; gap: var(--space-xs); }
        .ghost-note-form__label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        .ghost-note-form__textarea {
          font-family: var(--font-canvas);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          resize: vertical;
          min-height: 80px;
          background: var(--color-surface);
          outline: none;
        }
        .ghost-note-form__textarea:focus { border-color: var(--color-accent); }
        .ghost-note-form__select {
          font-size: var(--font-size-sm);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          color: var(--color-ink);
          font-family: var(--font-ui);
        }
        .ghost-note-form__actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-sm); }
      `}</style>
    </Modal>
  );
};
