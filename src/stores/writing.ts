import { createSignal, createRoot } from "solid-js";

export type FocusMode = "off" | "sentence" | "paragraph" | "distraction-free";

function createWritingStore() {
  // Focus modes
  const [focusMode, setFocusMode] = createSignal<FocusMode>("off");
  const [typewriterMode, setTypewriterMode] = createSignal(false);
  const [unwritingMode, setUnwritingMode] = createSignal(false);
  const [unwritingWordCount, setUnwritingWordCount] = createSignal(0);
  const [unwritingStartContent, setUnwritingStartContent] = createSignal("");

  // Smart punctuation
  const [smartPunctuation, setSmartPunctuation] = createSignal(true);

  // Split view
  const [splitViewOpen, setSplitViewOpen] = createSignal(false);
  const [splitChapterId, setSplitChapterId] = createSignal<string | null>(null);
  const [splitSyncScroll, setSplitSyncScroll] = createSignal(false);

  // Palimpsest
  const [palimpsestVisible, setPalimpsestVisible] = createSignal(false);
  const [palimpsestFragments, setPalimpsestFragments] = createSignal<PalimpsestFragment[]>([]);

  // Annotations
  const [annotations, setAnnotations] = createSignal<Annotation[]>([]);
  const [annotationsPanelOpen, setAnnotationsPanelOpen] = createSignal(false);

  // Find & Replace
  const [findReplaceOpen, setFindReplaceOpen] = createSignal(false);
  const [findQuery, setFindQuery] = createSignal("");
  const [replaceQuery, setReplaceQuery] = createSignal("");
  const [findRegex, setFindRegex] = createSignal(false);
  const [findCaseSensitive, setFindCaseSensitive] = createSignal(false);
  const [findMatchCount, setFindMatchCount] = createSignal(0);
  const [findCurrentIndex, setFindCurrentIndex] = createSignal(0);

  // Session tracking
  const [dailyTarget, setDailyTarget] = createSignal(
    parseInt(localStorage.getItem("quillborn-daily-target") || "1000")
  );
  const [sessionStartTime, setSessionStartTime] = createSignal<number | null>(null);
  const [sessionWordCount, setSessionWordCount] = createSignal(0);

  // Mood / Atmosphere
  const [chapterMood, setChapterMood] = createSignal<string | null>(null);

  // Character possession
  const [possessionCharacter, setPossessionCharacter] = createSignal<string | null>(null);

  const cycleFocusMode = () => {
    const modes: FocusMode[] = ["off", "sentence", "paragraph", "distraction-free"];
    const current = modes.indexOf(focusMode());
    setFocusMode(modes[(current + 1) % modes.length]);
  };

  const toggleTypewriter = () => setTypewriterMode((v) => !v);

  const toggleUnwriting = () => {
    if (!unwritingMode()) {
      setUnwritingWordCount(0);
    }
    setUnwritingMode((v) => !v);
  };

  const togglePalimpsest = () => setPalimpsestVisible((v) => !v);

  const addPalimpsestFragment = (fragment: PalimpsestFragment) => {
    setPalimpsestFragments((prev) => [...prev, fragment]);
  };

  const clearPalimpsest = (chapterId?: string) => {
    if (chapterId) {
      setPalimpsestFragments((prev) => prev.filter((f) => f.chapterId !== chapterId));
    } else {
      setPalimpsestFragments([]);
    }
  };

  const addAnnotation = (annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleFindReplace = () => setFindReplaceOpen((v) => !v);

  const updateDailyTarget = (target: number) => {
    setDailyTarget(target);
    localStorage.setItem("quillborn-daily-target", String(target));
  };

  const startSession = () => {
    setSessionStartTime(Date.now());
    setSessionWordCount(0);
  };

  const addSessionWords = (count: number) => {
    setSessionWordCount((prev) => prev + count);
  };

  return {
    // Focus
    focusMode,
    setFocusMode,
    cycleFocusMode,
    typewriterMode,
    toggleTypewriter,
    unwritingMode,
    unwritingWordCount,
    setUnwritingWordCount,
    unwritingStartContent,
    setUnwritingStartContent,
    toggleUnwriting,
    // Smart punctuation
    smartPunctuation,
    setSmartPunctuation,
    // Split view
    splitViewOpen,
    setSplitViewOpen,
    splitChapterId,
    setSplitChapterId,
    splitSyncScroll,
    setSplitSyncScroll,
    // Palimpsest
    palimpsestVisible,
    togglePalimpsest,
    palimpsestFragments,
    addPalimpsestFragment,
    clearPalimpsest,
    // Annotations
    annotations,
    annotationsPanelOpen,
    setAnnotationsPanelOpen,
    addAnnotation,
    removeAnnotation,
    // Find & Replace
    findReplaceOpen,
    toggleFindReplace,
    findQuery,
    setFindQuery,
    replaceQuery,
    setReplaceQuery,
    findRegex,
    setFindRegex,
    findCaseSensitive,
    setFindCaseSensitive,
    findMatchCount,
    setFindMatchCount,
    findCurrentIndex,
    setFindCurrentIndex,
    // Session
    dailyTarget,
    updateDailyTarget,
    sessionStartTime,
    startSession,
    sessionWordCount,
    addSessionWords,
    // Mood / Atmosphere
    chapterMood,
    setChapterMood,
    // Character possession
    possessionCharacter,
    setPossessionCharacter,
  };
}

export interface PalimpsestFragment {
  id: string;
  chapterId: string;
  text: string;
  position: number; // Character offset in original text
  deletedAt: number; // Timestamp
}

export interface Annotation {
  id: string;
  chapterId: string;
  text: string;
  type: "note" | "todo" | "research" | "question";
  startOffset: number;
  endOffset: number;
  createdAt: number;
}

export const writingStore = createRoot(createWritingStore);
