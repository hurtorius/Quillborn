import { createSignal, createRoot } from "solid-js";

export type Locale = "en" | "es" | "fr" | "de" | "ja" | "zh" | "ar";

const RTL_LOCALES: Locale[] = ["ar"];

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // File
    "file": "File",
    "file.new_manuscript": "New Manuscript",
    "file.open": "Open Manuscript",
    "file.save": "Save Snapshot",
    "file.new_chapter": "New Chapter",
    "file.import": "Import File",
    // View
    "view": "View",
    "view.sidebar": "Toggle Sidebar",
    "view.canvas": "Canvas View",
    "view.context_panel": "Toggle Context Panel",
    "view.theme": "Toggle Theme",
    // Writing
    "writing": "Writing",
    "writing.focus_cycle": "Cycle Focus Mode",
    "writing.distraction_free": "Distraction-Free Mode",
    "writing.typewriter": "Toggle Typewriter Scroll",
    "writing.unwriting": "Toggle Unwriting Mode",
    "writing.palimpsest": "Toggle Palimpsest Layer",
    "writing.mood": "Set Chapter Mood",
    "writing.ghost_note": "Leave Ghost Note",
    // Editing
    "editing": "Editing",
    "editing.find_replace": "Find & Replace",
    "editing.find_manuscript": "Find in Manuscript",
    // Planning
    "planning": "Planning",
    "planning.corkboard": "Corkboard View",
    "planning.outline": "Outline View",
    "planning.characters": "Character Sheets",
    "planning.wiki": "World-Building Wiki",
    "planning.timeline": "Timeline",
    "planning.constellation": "Constellation Map",
    // Export
    "export": "Export",
    "export.markdown": "Export as Markdown",
    "export.plain_text": "Export as Plain Text",
    "export.html": "Export as HTML",
    "export.latex": "Export as LaTeX",
    "export.epub": "Export as EPUB",
    // Navigation
    "navigation": "Navigation",
    "navigation.command_palette": "Command Palette",
    "navigation.quick_switch": "Quick Chapter Switch",
    // UI
    "ui.cancel": "Cancel",
    "ui.confirm": "Confirm",
    "ui.save": "Save",
    "ui.delete": "Delete",
    "ui.close": "Close",
    "ui.back": "Back",
    "ui.done": "Done",
    "ui.apply": "Apply",
    "ui.reset": "Reset to Default",
    "ui.search": "Search",
    "ui.no_results": "No results found",
    // Status
    "status.draft": "Draft",
    "status.revised": "Revised",
    "status.final": "Final",
    "status.trash": "Trash",
    // Stats
    "stats.words": "Words",
    "stats.readability": "Readability",
    "stats.avg_sentence": "Avg sentence",
    "stats.dialogue_ratio": "Dialogue ratio",
    "stats.mood": "Mood",
    "stats.session_words": "Session words",
    // Settings
    "settings": "Settings",
    "settings.theme_editor": "Theme Editor",
    "settings.custom_css": "Custom CSS",
    "settings.fonts": "Fonts",
    "settings.sound": "Sound",
    "settings.plugins": "Plugins",
    "settings.language": "Language",
  },
  es: {
    "file": "Archivo",
    "file.new_manuscript": "Nuevo Manuscrito",
    "file.open": "Abrir Manuscrito",
    "file.save": "Guardar Instantánea",
    "file.new_chapter": "Nuevo Capítulo",
    "ui.cancel": "Cancelar",
    "ui.confirm": "Confirmar",
    "ui.save": "Guardar",
    "ui.delete": "Eliminar",
    "ui.close": "Cerrar",
    "ui.search": "Buscar",
    "stats.words": "Palabras",
  },
  fr: {
    "file": "Fichier",
    "file.new_manuscript": "Nouveau Manuscrit",
    "file.open": "Ouvrir Manuscrit",
    "file.save": "Enregistrer",
    "file.new_chapter": "Nouveau Chapitre",
    "ui.cancel": "Annuler",
    "ui.confirm": "Confirmer",
    "ui.save": "Enregistrer",
    "ui.delete": "Supprimer",
    "ui.close": "Fermer",
    "ui.search": "Rechercher",
    "stats.words": "Mots",
  },
  de: {
    "file": "Datei",
    "file.new_manuscript": "Neues Manuskript",
    "file.open": "Manuskript Öffnen",
    "file.save": "Speichern",
    "file.new_chapter": "Neues Kapitel",
    "ui.cancel": "Abbrechen",
    "ui.confirm": "Bestätigen",
    "ui.save": "Speichern",
    "ui.delete": "Löschen",
    "ui.close": "Schließen",
    "ui.search": "Suchen",
    "stats.words": "Wörter",
  },
  ja: {
    "file": "ファイル",
    "file.new_manuscript": "新規原稿",
    "file.open": "原稿を開く",
    "file.save": "スナップショットを保存",
    "file.new_chapter": "新規章",
    "ui.cancel": "キャンセル",
    "ui.confirm": "確認",
    "ui.save": "保存",
    "ui.delete": "削除",
    "ui.close": "閉じる",
    "ui.search": "検索",
    "stats.words": "単語数",
  },
  zh: {
    "file": "文件",
    "file.new_manuscript": "新建稿件",
    "file.open": "打开稿件",
    "file.save": "保存快照",
    "file.new_chapter": "新建章节",
    "ui.cancel": "取消",
    "ui.confirm": "确认",
    "ui.save": "保存",
    "ui.delete": "删除",
    "ui.close": "关闭",
    "ui.search": "搜索",
    "stats.words": "字数",
  },
  ar: {
    "file": "ملف",
    "file.new_manuscript": "مخطوطة جديدة",
    "file.open": "فتح مخطوطة",
    "file.save": "حفظ لقطة",
    "file.new_chapter": "فصل جديد",
    "ui.cancel": "إلغاء",
    "ui.confirm": "تأكيد",
    "ui.save": "حفظ",
    "ui.delete": "حذف",
    "ui.close": "إغلاق",
    "ui.search": "بحث",
    "stats.words": "كلمات",
  },
};

function createI18nStore() {
  const [locale, setLocaleSignal] = createSignal<Locale>(
    (localStorage.getItem("quillborn-locale") as Locale) || "en"
  );

  const isRtl = () => RTL_LOCALES.includes(locale());

  const setLocale = (newLocale: Locale) => {
    setLocaleSignal(newLocale);
    localStorage.setItem("quillborn-locale", newLocale);
    document.documentElement.setAttribute("dir", isRtl() ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", newLocale);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const currentLocale = locale();
    let text = translations[currentLocale]?.[key] || translations.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  };

  const getAvailableLocales = (): { code: Locale; name: string }[] => [
    { code: "en", name: "English" },
    { code: "es", name: "Espanol" },
    { code: "fr", name: "Francais" },
    { code: "de", name: "Deutsch" },
    { code: "ja", name: "日本語" },
    { code: "zh", name: "中文" },
    { code: "ar", name: "العربية" },
  ];

  // Initialize direction on load
  if (RTL_LOCALES.includes(locale())) {
    document.documentElement.setAttribute("dir", "rtl");
  }

  return { locale, setLocale, t, isRtl, getAvailableLocales };
}

export const i18n = createRoot(createI18nStore);

// Convenience re-exports
export const t = i18n.t;
export const setLocale = i18n.setLocale;
