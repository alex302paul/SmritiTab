import {
  Check,
  ExternalLink,
  FolderPlus,
  Pencil,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { CATEGORY_ACCENTS } from "../../data/defaults";
import { extractDomain, normalizeUrl } from "../../services/browserApi";
import type { AppLink, Category } from "../../types/smrititab";
import { FaviconBadge } from "../FaviconBadge";

type EditorState =
  | null
  | { type: "add-link"; categoryId: string }
  | { type: "edit-link"; app: AppLink }
  | { type: "add-category" }
  | { type: "edit-category"; category: Category };

export function QuickLinksOverlay() {
  const {
    categories,
    apps,
    dock,
    createCategory,
    updateCategory,
    deleteCategory,
    createApp,
    updateApp,
    deleteApp,
    toggleFavorite,
    isFavorite,
    updateDock,
    openApp,
    closeOverlay,
  } = useSmriti();

  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);

  // Form fields
  const [nameInput, setNameInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [iconInput, setIconInput] = useState("");
  const [catSelect, setCatSelect] = useState(categories[0]?.id ?? "cat_work");
  const [accentInput, setAccentInput] = useState(CATEGORY_ACCENTS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  // Intercept Escape to close inner editor first before closing Quick Links overlay
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setEditor(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editor]);

  const openAddLink = (categoryId: string) => {
    setNameInput("");
    setUrlInput("");
    setIconInput("");
    setCatSelect(categoryId);
    setFormError(null);
    setEditor({ type: "add-link", categoryId });
  };

  const openEditLink = (app: AppLink) => {
    setNameInput(app.name);
    setUrlInput(app.target);
    setIconInput(app.iconText);
    setCatSelect(app.categoryId);
    setFormError(null);
    setEditor({ type: "edit-link", app });
  };

  const openAddCategory = () => {
    setNameInput("");
    setAccentInput(CATEGORY_ACCENTS[categories.length % CATEGORY_ACCENTS.length]);
    setFormError(null);
    setEditor({ type: "add-category" });
  };

  const openEditCategory = (category: Category) => {
    setNameInput(category.name);
    setAccentInput(category.accent);
    setFormError(null);
    setEditor({ type: "edit-category", category });
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    setFormError(null);

    if (editor.type === "add-category") {
      if (!nameInput.trim()) {
        setFormError("Enter a category name.");
        return;
      }
      createCategory({ name: nameInput.trim(), accent: accentInput });
      setEditor(null);
      return;
    }

    if (editor.type === "edit-category") {
      if (!nameInput.trim()) {
        setFormError("Category name cannot be empty.");
        return;
      }
      updateCategory(editor.category.id, { name: nameInput.trim(), accent: accentInput });
      setEditor(null);
      return;
    }

    if (!nameInput.trim()) {
      setFormError("Enter a link title.");
      return;
    }
    if (!urlInput.trim()) {
      setFormError("Enter a website URL.");
      return;
    }
    const normalized = normalizeUrl(urlInput);

    if (editor.type === "add-link") {
      createApp({
        name: nameInput.trim(),
        target: normalized,
        kind: "web",
        categoryId: catSelect || categories[0]?.id || "cat_work",
        iconText: iconInput.trim() || nameInput.trim().slice(0, 2).toUpperCase(),
      });
      setEditor(null);
    } else if (editor.type === "edit-link") {
      updateApp(editor.app.id, {
        name: nameInput.trim(),
        target: normalized,
        categoryId: catSelect,
        iconText: iconInput.trim() || nameInput.trim().slice(0, 2).toUpperCase(),
      });
      setEditor(null);
    }
  };

  const togglePinToDock = (appId: string) => {
    const exists = dock.appIds.includes(appId);
    updateDock({
      appIds: exists ? dock.appIds.filter((id) => id !== appId) : [...dock.appIds, appId],
    });
  };

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => {
        const catApps = apps.filter((a) => {
          if (a.categoryId !== cat.id) return false;
          if (!q) return true;
          return `${a.name} ${a.target} ${cat.name}`.toLowerCase().includes(q);
        });
        return { category: cat, apps: catApps };
      })
      .filter((entry) => !q || entry.apps.length > 0 || entry.category.name.toLowerCase().includes(q));
  }, [categories, apps, query]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Links"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay();
      }}
      className="animate-smriti-fade fixed inset-0 z-[200] flex flex-col overflow-hidden bg-slate-950/58 backdrop-blur-2xl"
    >
      {/* Full-screen content wrapper — cards stay razor-sharp */}
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
        {/* Top bar */}
        <header className="flex flex-wrap items-center gap-3 pb-6">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Quick Links
            </h1>
            <p className="text-xs text-slate-300/80">
              {categories.length} {categories.length === 1 ? "category" : "categories"} ·{" "}
              {apps.length} {apps.length === 1 ? "link" : "links"}
            </p>
          </div>

          {/* Search filter */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter quick links…"
              aria-label="Filter quick links"
              className="w-full rounded-xl border border-white/15 bg-slate-900/90 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-400 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAddCategory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-white/30 hover:bg-slate-800"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Category</span>
            </button>
            <button
              type="button"
              onClick={() => openAddLink(categories[0]?.id ?? "cat_work")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add link</span>
            </button>
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                editMode
                  ? "border-orange-500/60 bg-orange-500/20 text-orange-200"
                  : "border-white/15 bg-slate-900/90 text-slate-200 hover:border-white/30 hover:bg-slate-800"
              }`}
            >
              {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              <span>{editMode ? "Done" : "Edit"}</span>
            </button>
            <button
              type="button"
              onClick={closeOverlay}
              aria-label="Close Quick Links"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-slate-900/90 text-slate-200 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Inline Category / Link Editor Drawer */}
        {editor && (
          <form
            onSubmit={handleSaveEditor}
            className="animate-smriti-scale mb-5 rounded-2xl border border-slate-200/20 bg-white p-4 text-slate-900 shadow-2xl dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editor.type === "add-category"
                  ? "New Category"
                  : editor.type === "edit-category"
                    ? `Edit "${editor.category.name}"`
                    : editor.type === "edit-link"
                      ? `Edit "${editor.app.name}"`
                      : "Add Quick Link"}
              </h2>
              <button
                type="button"
                onClick={() => setEditor(null)}
                aria-label="Cancel editing"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editor.type === "add-category" || editor.type === "edit-category" ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Category name (e.g., Design, Reading)"
                  maxLength={40}
                  autoFocus
                  className="min-w-[200px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Category color">
                  {CATEGORY_ACCENTS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccentInput(hex)}
                      aria-label={`Accent ${hex}`}
                      aria-pressed={accentInput === hex}
                      style={{ backgroundColor: hex }}
                      className={`h-6 w-6 rounded-full transition ${
                        accentInput === hex
                          ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                          : "opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  Save category
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Link name (e.g., Linear)"
                  maxLength={40}
                  autoFocus
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 sm:col-span-3 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://linear.app"
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 sm:col-span-4 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <select
                  value={catSelect}
                  onChange={(e) => setCatSelect(e.target.value)}
                  aria-label="Category"
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 sm:col-span-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={iconInput}
                  onChange={(e) => setIconInput(e.target.value)}
                  placeholder="Badge"
                  maxLength={3}
                  aria-label="Icon initials"
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 sm:col-span-1 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 sm:col-span-2"
                >
                  Save link
                </button>
              </div>
            )}
            {formError && <p className="mt-2 text-xs text-rose-500">{formError}</p>}
          </form>
        )}

        {/* Unified Category Grid — Razor-sharp crisp cards */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pr-1">
          {grouped.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/90 text-center">
              <p className="text-sm font-medium text-white">No quick links match "{query}"</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-xs text-orange-400 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {grouped.map(({ category, apps: catApps }) => (
                <section
                  key={category.id}
                  data-category-id={category.id}
                  className="animate-smriti-scale flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111623]"
                >
                  <header className="mb-4 flex items-center gap-2.5 border-b border-slate-200/70 pb-3 dark:border-white/10">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.accent }}
                    />
                    <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                      {category.name}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/8 dark:text-slate-400">
                      {catApps.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddLink(category.id)}
                      aria-label={`Add link to ${category.name}`}
                      title={`Add link to ${category.name}`}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-indigo-400"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {editMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditCategory(category)}
                          aria-label={`Edit ${category.name}`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteCategory(category.id)}
                            aria-label={`Delete ${category.name}`}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </header>

                  {catApps.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-white/10">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No links in {category.name} yet
                      </p>
                      <button
                        type="button"
                        onClick={() => openAddLink(category.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add first link
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {catApps.map((app) => {
                        const fav = isFavorite(app.target);
                        const pinnedDock = dock.appIds.includes(app.id);
                        return (
                          <div
                            key={app.id}
                            className="group relative flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5 transition hover:border-orange-500/40 hover:bg-orange-500/[0.04] dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-orange-500/40 dark:hover:bg-white/[0.06]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                openApp(app);
                                closeOverlay();
                              }}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <FaviconBadge
                                url={app.target}
                                label={app.name}
                                fallbackText={app.iconText}
                                accent={category.accent}
                                size="md"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {app.name}
                                </p>
                                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  {extractDomain(app.target)}
                                </p>
                              </div>
                            </button>

                            {editMode ? (
                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => togglePinToDock(app.id)}
                                  aria-label={pinnedDock ? "Remove from dock" : "Pin to dock"}
                                  title={pinnedDock ? "Pinned to Dock" : "Pin to Dock"}
                                  className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                                    pinnedDock
                                      ? "bg-indigo-500/15 text-indigo-500"
                                      : "text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10"
                                  }`}
                                >
                                  <Pin className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditLink(app)}
                                  aria-label={`Edit ${app.name}`}
                                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteApp(app.id)}
                                  aria-label={`Delete ${app.name}`}
                                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => toggleFavorite(app.target, app.name)}
                                  aria-label={
                                    fav
                                      ? `Remove ${app.name} from favorites`
                                      : `Add ${app.name} to favorites`
                                  }
                                  className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                                    fav
                                      ? "text-amber-400"
                                      : "text-slate-400 hover:text-amber-400"
                                  }`}
                                >
                                  <Star
                                    className="h-3.5 w-3.5"
                                    fill={fav ? "currentColor" : "none"}
                                  />
                                </button>
                                <span
                                  aria-hidden="true"
                                  className="grid h-7 w-7 place-items-center text-slate-400"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-4 flex items-center justify-between text-[11px] text-slate-300/75">
          <span>All Quick Links & categories are saved automatically to smrititab:v1</span>
          <span className="hidden sm:inline">
            Press <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to return to wallpaper
          </span>
        </footer>
      </div>
    </div>
  );
}
