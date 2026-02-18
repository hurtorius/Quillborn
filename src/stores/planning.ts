import { createSignal, createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";

export interface CharacterSheet {
  id: string;
  name: string;
  role: string;
  description: string;
  arcSummary: string;
  speechPatterns: string;
  firstAppearance: string;
  lastAppearance: string;
  relationships: Relationship[];
  portrait: string | null;
  customFields: Record<string, string>;
  // Possession mode settings
  possession: PossessionSettings;
  createdAt: number;
  modifiedAt: number;
}

export interface Relationship {
  targetId: string;
  type: "ally" | "enemy" | "family" | "lover" | "mentor" | "rival" | "other";
  label: string;
}

export interface PossessionSettings {
  marginWidth: "narrow" | "normal" | "wide";
  grainIntensity: number; // 0-1
  warmth: number; // -1 to 1 (cool to warm)
  accentTint: string | null;
}

export interface WikiEntry {
  id: string;
  title: string;
  content: string;
  category: "locations" | "factions" | "objects" | "lore" | "rules" | "history";
  linkedChapters: string[];
  tags: string[];
  createdAt: number;
  modifiedAt: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  plotThread: string;
  linkedChapters: string[];
  position: number; // Relative position on timeline
  track: number; // Which parallel track
  color: string;
}

export interface GhostNote {
  id: string;
  chapterId: string;
  message: string;
  trigger: GhostNoteTrigger;
  revealed: boolean;
  dismissed: boolean;
  createdAt: number;
}

export type GhostNoteTrigger =
  | { type: "date"; date: string }
  | { type: "word_count"; count: number }
  | { type: "chapter_visits"; chapterId: string; visits: number }
  | { type: "status_change"; status: string }
  | { type: "manual" };

export interface CorkboardCard {
  id: string;
  chapterId: string;
  x: number;
  y: number;
  pinned: boolean;
  label: string;
  color: string;
}

export interface PlotThread {
  id: string;
  name: string;
  color: string;
  chapters: string[];
}

function createPlanningStore() {
  const [characters, setCharacters] = createStore<Record<string, CharacterSheet>>({});
  const [wikiEntries, setWikiEntries] = createStore<Record<string, WikiEntry>>({});
  const [timelineEvents, setTimelineEvents] = createStore<Record<string, TimelineEvent>>({});
  const [ghostNotes, setGhostNotes] = createStore<Record<string, GhostNote>>({});
  const [corkboardCards, setCorkboardCards] = createStore<Record<string, CorkboardCard>>({});
  const [plotThreads, setPlotThreads] = createStore<Record<string, PlotThread>>({});

  const [activeView, setActiveView] = createSignal<
    "corkboard" | "outline" | "characters" | "wiki" | "timeline" | "constellation" | null
  >(null);

  // Characters
  const addCharacter = (character: CharacterSheet) => {
    setCharacters(character.id, character);
  };

  const updateCharacter = (id: string, updates: Partial<CharacterSheet>) => {
    setCharacters(produce((chars) => {
      if (chars[id]) {
        Object.assign(chars[id], updates, { modifiedAt: Date.now() });
      }
    }));
  };

  const deleteCharacter = (id: string) => {
    setCharacters(produce((chars) => { delete chars[id]; }));
  };

  // Wiki
  const addWikiEntry = (entry: WikiEntry) => {
    setWikiEntries(entry.id, entry);
  };

  const updateWikiEntry = (id: string, updates: Partial<WikiEntry>) => {
    setWikiEntries(produce((entries) => {
      if (entries[id]) {
        Object.assign(entries[id], updates, { modifiedAt: Date.now() });
      }
    }));
  };

  const deleteWikiEntry = (id: string) => {
    setWikiEntries(produce((entries) => { delete entries[id]; }));
  };

  const findBacklinks = (entryId: string): WikiEntry[] => {
    const title = wikiEntries[entryId]?.title;
    if (!title) return [];
    return Object.values(wikiEntries).filter(
      (e) => e.id !== entryId && e.content.includes(`[[${title}]]`)
    );
  };

  // Timeline
  const addTimelineEvent = (event: TimelineEvent) => {
    setTimelineEvents(event.id, event);
  };

  const updateTimelineEvent = (id: string, updates: Partial<TimelineEvent>) => {
    setTimelineEvents(produce((events) => {
      if (events[id]) Object.assign(events[id], updates);
    }));
  };

  const deleteTimelineEvent = (id: string) => {
    setTimelineEvents(produce((events) => { delete events[id]; }));
  };

  // Ghost Notes
  const addGhostNote = (note: GhostNote) => {
    setGhostNotes(note.id, note);
  };

  const revealGhostNote = (id: string) => {
    setGhostNotes(produce((notes) => {
      if (notes[id]) notes[id].revealed = true;
    }));
  };

  const dismissGhostNote = (id: string) => {
    setGhostNotes(produce((notes) => {
      if (notes[id]) notes[id].dismissed = true;
    }));
  };

  // Corkboard
  const addCorkboardCard = (card: CorkboardCard) => {
    setCorkboardCards(card.id, card);
  };

  const moveCorkboardCard = (id: string, x: number, y: number) => {
    setCorkboardCards(produce((cards) => {
      if (cards[id]) {
        cards[id].x = x;
        cards[id].y = y;
      }
    }));
  };

  // Plot Threads
  const addPlotThread = (thread: PlotThread) => {
    setPlotThreads(thread.id, thread);
  };

  const updatePlotThread = (id: string, updates: Partial<PlotThread>) => {
    setPlotThreads(produce((threads) => {
      if (threads[id]) Object.assign(threads[id], updates);
    }));
  };

  return {
    // Characters
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    // Wiki
    wikiEntries,
    addWikiEntry,
    updateWikiEntry,
    deleteWikiEntry,
    findBacklinks,
    // Timeline
    timelineEvents,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    // Ghost Notes
    ghostNotes,
    addGhostNote,
    revealGhostNote,
    dismissGhostNote,
    // Corkboard
    corkboardCards,
    addCorkboardCard,
    moveCorkboardCard,
    // Plot Threads
    plotThreads,
    addPlotThread,
    updatePlotThread,
    // View
    activeView,
    setActiveView,
  };
}

export const planningStore = createRoot(createPlanningStore);
