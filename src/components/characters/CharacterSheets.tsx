import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { planningStore, CharacterSheet, Relationship } from "@/stores/planning";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export const CharacterSheets: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [editModalOpen, setEditModalOpen] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<"cards" | "graph">("cards");

  const characterList = createMemo(() => Object.values(planningStore.characters));

  const selected = createMemo(() => {
    const id = selectedId();
    return id ? planningStore.characters[id] : null;
  });

  const handleCreate = () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newChar: CharacterSheet = {
      id, name: "New Character", role: "", description: "", arcSummary: "",
      speechPatterns: "", firstAppearance: "", lastAppearance: "",
      relationships: [], portrait: null, customFields: {},
      possession: { marginWidth: "normal", grainIntensity: 0.03, warmth: 0, accentTint: null },
      createdAt: now, modifiedAt: now,
    };
    planningStore.addCharacter(newChar);
    setSelectedId(id);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    planningStore.deleteCharacter(id);
    if (selectedId() === id) setSelectedId(null);
  };

  return (
    <div class="character-sheets">
      <div class="character-sheets__toolbar">
        <span class="character-sheets__title">Characters</span>
        <div class="character-sheets__toolbar-actions">
          <Button size="sm" variant={viewMode() === "cards" ? "ghost" : "subtle"} active={viewMode() === "cards"} onClick={() => setViewMode("cards")}>Cards</Button>
          <Button size="sm" variant={viewMode() === "graph" ? "ghost" : "subtle"} active={viewMode() === "graph"} onClick={() => setViewMode("graph")}>Graph</Button>
          <Button size="sm" variant="ghost" onClick={handleCreate}>+ New</Button>
        </div>
      </div>

      <Show when={viewMode() === "cards"}>
        <div class="character-sheets__grid">
          <For each={characterList()}>
            {(character) => (
              <div
                class={`character-card ${selectedId() === character.id ? "character-card--selected" : ""}`}
                onClick={() => setSelectedId(character.id)}
                onDblClick={() => { setSelectedId(character.id); setEditModalOpen(true); }}
              >
                <div class="character-card__portrait">
                  <Show when={character.portrait} fallback={
                    <div class="character-card__portrait-placeholder">
                      {character.name.charAt(0).toUpperCase()}
                    </div>
                  }>
                    <img src={character.portrait!} alt={character.name} />
                  </Show>
                </div>
                <div class="character-card__info">
                  <h3 class="character-card__name">{character.name}</h3>
                  <Show when={character.role}>
                    <span class="character-card__role">{character.role}</span>
                  </Show>
                  <Show when={character.description}>
                    <p class="character-card__desc truncate">{character.description}</p>
                  </Show>
                  <Show when={character.relationships.length > 0}>
                    <div class="character-card__relations">
                      {character.relationships.length} relationship{character.relationships.length !== 1 ? "s" : ""}
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
          <Show when={characterList().length === 0}>
            <div class="character-sheets__empty">
              <p>No characters yet.</p>
              <Button size="sm" variant="ghost" onClick={handleCreate}>Create your first character</Button>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={viewMode() === "graph"}>
        <RelationshipGraph characters={characterList()} />
      </Show>

      <Show when={editModalOpen() && selected()}>
        <CharacterEditModal
          character={selected()!}
          allCharacters={characterList()}
          onClose={() => setEditModalOpen(false)}
          onSave={(updates) => {
            planningStore.updateCharacter(selected()!.id, updates);
            setEditModalOpen(false);
          }}
          onDelete={() => { handleDelete(selected()!.id); setEditModalOpen(false); }}
        />
      </Show>

      <style>{`
        .character-sheets {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-raised);
          overflow: hidden;
        }
        .character-sheets__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--color-border-subtle);
          flex-shrink: 0;
        }
        .character-sheets__title {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: 600;
        }
        .character-sheets__toolbar-actions {
          display: flex;
          gap: 4px;
        }
        .character-sheets__grid {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-md);
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: var(--space-md);
          align-content: start;
        }
        .character-sheets__empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: var(--space-2xl);
          color: var(--color-ghost);
          font-size: var(--font-size-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
        }
        .character-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .character-card:hover { box-shadow: var(--shadow-md); }
        .character-card--selected { border-color: var(--color-accent); }
        .character-card__portrait {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          margin-bottom: var(--space-sm);
          border: 2px solid var(--color-border-subtle);
        }
        .character-card__portrait img { width: 100%; height: 100%; object-fit: cover; }
        .character-card__portrait-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bone-dust);
          color: var(--color-ghost);
          font-family: var(--font-display);
          font-size: var(--font-size-xl);
          font-weight: 600;
        }
        .character-card__name {
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-ink);
          margin-bottom: 2px;
        }
        .character-card__role {
          font-size: var(--font-size-xs);
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .character-card__desc {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          margin-top: var(--space-xs);
        }
        .character-card__relations {
          font-size: 10px;
          color: var(--color-ghost);
          margin-top: var(--space-xs);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

// Relationship Graph (force-directed layout)
const RelationshipGraph: Component<{ characters: CharacterSheet[] }> = (props) => {
  const nodes = createMemo(() =>
    props.characters.map((c, i) => {
      const angle = (i / Math.max(props.characters.length, 1)) * Math.PI * 2;
      const radius = 150;
      return {
        id: c.id,
        name: c.name,
        x: 250 + Math.cos(angle) * radius,
        y: 200 + Math.sin(angle) * radius,
      };
    })
  );

  const edges = createMemo(() => {
    const result: { from: string; to: string; label: string }[] = [];
    for (const char of props.characters) {
      for (const rel of char.relationships) {
        result.push({ from: char.id, to: rel.targetId, label: rel.label || rel.type });
      }
    }
    return result;
  });

  const getNode = (id: string) => nodes().find((n) => n.id === id);

  return (
    <div class="relationship-graph">
      <svg width="100%" height="100%" viewBox="0 0 500 400">
        <For each={edges()}>
          {(edge) => {
            const from = getNode(edge.from);
            const to = getNode(edge.to);
            if (!from || !to) return null;
            return (
              <g>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--color-ghost)" stroke-width="1" opacity="0.4" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4} text-anchor="middle" font-size="9" fill="var(--color-ghost)">{edge.label}</text>
              </g>
            );
          }}
        </For>
        <For each={nodes()}>
          {(node) => (
            <g>
              <circle cx={node.x} cy={node.y} r="20" fill="var(--color-surface)" stroke="var(--color-border)" stroke-width="1.5" />
              <text x={node.x} y={node.y + 4} text-anchor="middle" font-size="10" fill="var(--color-ink)" font-weight="600">{node.name.substring(0, 8)}</text>
            </g>
          )}
        </For>
      </svg>

      <style>{`
        .relationship-graph {
          flex: 1;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .relationship-graph svg {
          max-width: 100%;
          max-height: 100%;
        }
      `}</style>
    </div>
  );
};

// Character Edit Modal
const CharacterEditModal: Component<{
  character: CharacterSheet;
  allCharacters: CharacterSheet[];
  onClose: () => void;
  onSave: (updates: Partial<CharacterSheet>) => void;
  onDelete: () => void;
}> = (props) => {
  const [name, setName] = createSignal(props.character.name);
  const [role, setRole] = createSignal(props.character.role);
  const [description, setDescription] = createSignal(props.character.description);
  const [arcSummary, setArcSummary] = createSignal(props.character.arcSummary);
  const [speechPatterns, setSpeechPatterns] = createSignal(props.character.speechPatterns);

  const handleSave = () => {
    props.onSave({
      name: name(), role: role(), description: description(),
      arcSummary: arcSummary(), speechPatterns: speechPatterns(),
    });
  };

  return (
    <Modal open={true} onClose={props.onClose} title="Edit Character" width="560px">
      <div class="character-edit">
        <Input label="Name" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <Input label="Role" value={role()} onInput={(e) => setRole(e.currentTarget.value)} placeholder="Protagonist, Antagonist, Mentor..." />
        <div class="character-edit__field">
          <label class="character-edit__label">Description</label>
          <textarea class="character-edit__textarea" value={description()} onInput={(e) => setDescription(e.currentTarget.value)} rows={3} />
        </div>
        <div class="character-edit__field">
          <label class="character-edit__label">Character Arc</label>
          <textarea class="character-edit__textarea" value={arcSummary()} onInput={(e) => setArcSummary(e.currentTarget.value)} rows={2} />
        </div>
        <Input label="Speech Patterns" value={speechPatterns()} onInput={(e) => setSpeechPatterns(e.currentTarget.value)} placeholder="Formal, uses metaphors, stutters when nervous..." />
        <div class="character-edit__actions">
          <Button variant="danger" size="sm" onClick={props.onDelete}>Delete</Button>
          <div style={{ flex: "1" }} />
          <Button variant="ghost" onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      </div>
      <style>{`
        .character-edit {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding-top: var(--space-sm);
        }
        .character-edit__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .character-edit__label {
          font-size: var(--font-size-xs);
          color: var(--color-ghost);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        .character-edit__textarea {
          font-family: var(--font-ui);
          font-size: var(--font-size-sm);
          color: var(--color-ink);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-sm) 0;
          resize: vertical;
          min-height: 48px;
        }
        .character-edit__textarea:focus { border-bottom-color: var(--color-accent); outline: none; }
        .character-edit__actions {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-sm);
        }
      `}</style>
    </Modal>
  );
};
