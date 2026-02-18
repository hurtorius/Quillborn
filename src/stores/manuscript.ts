import { createSignal, createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";

export interface ManuscriptNode {
  id: string;
  title: string;
  node_type: "book" | "part" | "chapter" | "scene";
  children: string[];
  status: "draft" | "revised" | "final" | "trash";
  mood?: string;
  pov?: string;
  word_count: number;
}

export interface ProjectMetadata {
  title: string;
  author: string;
  genre: string;
  word_count_target?: number;
  deadline?: string;
  created_at: string;
  modified_at: string;
}

export interface ManuscriptStructure {
  root: string;
  nodes: Record<string, ManuscriptNode>;
  order: string[];
}

export interface ProjectState {
  path: string;
  metadata: ProjectMetadata;
  structure: ManuscriptStructure;
  total_word_count: number;
}

export interface ChapterData {
  id: string;
  title: string;
  content: string;
  status: string;
  mood?: string;
  pov?: string;
  word_count: number;
  created_at: string;
  modified_at: string;
}

export interface ManuscriptStore {
  project: ProjectState | null;
  activeChapterId: string | null;
  activeChapter: ChapterData | null;
  sidebarOpen: boolean;
  contextPanelOpen: boolean;
  isDirty: boolean;
  sessionWordCount: number;
  sessionStartTime: number | null;
}

function createManuscriptStore() {
  const [store, setStore] = createStore<ManuscriptStore>({
    project: null,
    activeChapterId: null,
    activeChapter: null,
    sidebarOpen: true,
    contextPanelOpen: false,
    isDirty: false,
    sessionWordCount: 0,
    sessionStartTime: null,
  });

  const setProject = (project: ProjectState | null) => {
    setStore("project", project);
    if (project) {
      setStore("sessionStartTime", Date.now());
    }
  };

  const setActiveChapter = (chapter: ChapterData | null) => {
    setStore("activeChapterId", chapter?.id ?? null);
    setStore("activeChapter", chapter);
  };

  const updateChapterContent = (content: string) => {
    if (store.activeChapter) {
      const oldCount = store.activeChapter.word_count;
      const newCount = content.split(/\s+/).filter(Boolean).length;
      setStore("activeChapter", "content", content);
      setStore("activeChapter", "word_count", newCount);
      setStore("isDirty", true);
      setStore("sessionWordCount", (prev) => prev + Math.max(0, newCount - oldCount));
    }
  };

  const updateNodeWordCount = (nodeId: string, wordCount: number) => {
    setStore(
      produce((s) => {
        if (s.project?.structure.nodes[nodeId]) {
          s.project.structure.nodes[nodeId].word_count = wordCount;
        }
      })
    );
  };

  const addNode = (node: ManuscriptNode, parentId?: string) => {
    setStore(
      produce((s) => {
        if (!s.project) return;
        s.project.structure.nodes[node.id] = node;
        s.project.structure.order.push(node.id);
        const parent = parentId || s.project.structure.root;
        if (s.project.structure.nodes[parent]) {
          s.project.structure.nodes[parent].children.push(node.id);
        }
      })
    );
  };

  const removeNode = (nodeId: string) => {
    setStore(
      produce((s) => {
        if (!s.project) return;
        // Remove from all parents' children
        for (const node of Object.values(s.project.structure.nodes)) {
          node.children = node.children.filter((c: string) => c !== nodeId);
        }
        s.project.structure.order = s.project.structure.order.filter(
          (id: string) => id !== nodeId
        );
        delete s.project.structure.nodes[nodeId];
        if (s.activeChapterId === nodeId) {
          s.activeChapterId = null;
          s.activeChapter = null;
        }
      })
    );
  };

  const renameNode = (nodeId: string, newTitle: string) => {
    setStore(
      produce((s) => {
        if (s.project?.structure.nodes[nodeId]) {
          s.project.structure.nodes[nodeId].title = newTitle;
        }
        if (s.activeChapter?.id === nodeId) {
          s.activeChapter!.title = newTitle;
        }
      })
    );
  };

  const reorderChildren = (parentId: string, newOrder: string[]) => {
    setStore(
      produce((s) => {
        if (s.project?.structure.nodes[parentId]) {
          s.project.structure.nodes[parentId].children = newOrder;
        }
      })
    );
  };

  const toggleSidebar = () => {
    setStore("sidebarOpen", (prev) => !prev);
  };

  const toggleContextPanel = () => {
    setStore("contextPanelOpen", (prev) => !prev);
  };

  const markClean = () => {
    setStore("isDirty", false);
  };

  return {
    store,
    setProject,
    setActiveChapter,
    updateChapterContent,
    updateNodeWordCount,
    addNode,
    removeNode,
    renameNode,
    reorderChildren,
    toggleSidebar,
    toggleContextPanel,
    markClean,
  };
}

export const manuscriptStore = createRoot(createManuscriptStore);
