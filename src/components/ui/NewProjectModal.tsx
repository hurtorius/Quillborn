import { Component, createSignal } from "solid-js";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, author: string) => void;
}

export const NewProjectModal: Component<NewProjectModalProps> = (props) => {
  const [title, setTitle] = createSignal("");
  const [author, setAuthor] = createSignal("");

  const handleCreate = () => {
    const t = title().trim();
    if (!t) return;
    props.onCreate(t, author().trim());
    setTitle("");
    setAuthor("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  return (
    <Modal open={props.open} onClose={props.onClose} title="New Manuscript">
      <div class="new-project-form">
        <Input
          label="Title"
          placeholder="The Great Novel"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          autofocus
        />
        <Input
          label="Author"
          placeholder="Your name"
          value={author()}
          onInput={(e) => setAuthor(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        <div class="new-project-form__actions">
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!title().trim()}>
            Create Manuscript
          </Button>
        </div>
      </div>

      <style>{`
        .new-project-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          padding-top: var(--space-sm);
        }

        .new-project-form__actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-sm);
          margin-top: var(--space-sm);
        }
      `}</style>
    </Modal>
  );
};
