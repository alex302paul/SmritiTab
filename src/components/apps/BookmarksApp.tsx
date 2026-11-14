import {
  Bookmark,
  ChevronRight,
  Copy,
  ExternalLink,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import {
  createBookmarkNode,
  deleteBookmarkNode,
  extractDomain,
  hasChromeBookmarks,
  loadBookmarkTree,
  normalizeUrl,
  openBookmarkFolderAsGroup,
  updateBookmarkNode,
} from "../../services/browserApi";
import type { BookmarkNode } from "../../types/smrititab";
import { FaviconBadge } from "../FaviconBadge";

interface FlatFolder {
  id: string;
  title: string;
  depth: number;
  node: BookmarkNode;
}

function flattenFolders(nodes: BookmarkNode[], depth = 0): FlatFolder[] {
  const out: FlatFolder[] = [];
  for (const node of nodes) {
    if (!node.url) {
      if (node.title) {
        out.push({ id: node.id, title: node.title, depth, node });
      }
      if (node.children) {
        out.push(...flattenFolders(node.children, node.title ? depth + 1 : depth));
      }
    }
  }
  return out;
}

function findNodeById(nodes: BookmarkNode[], id: string | null): BookmarkNode | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const hit = findNodeById(n.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function searchTreeLinks(
  nodes: BookmarkNode[],
  query: string,
  path = "",
): Array<{ node: BookmarkNode; path: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Array<{ node: BookmarkNode; path: string }> = [];
  for (const node of nodes) {
    const nextPath = path ? `${path} / ${node.title}` : node.title;
    if (node.url) {
      if (`${node.title} ${node.url}`.toLowerCase().includes(q)) {
        results.push({ node, path });
      }
    } else if (node.children) {
      results.push(...searchTreeLinks(node.children, q, nextPath));
    }
  }
  return results;
}

export function BookmarksApp() {
  const { openUrl, toggleFavorite, isFavorite, settings } = useSmriti();
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Inline create / edit form state
  const [modalMode, setModalMode] = useState<
    null | { kind: "create-bm" } | { kind: "edit-bm"; node: BookmarkNode } | { kind: "create-folder" }
  >(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBookmarkTree();
      setTree(data);
      const folders = flattenFolders(data);
      setSelectedFolderId((prev) => {
        if (prev && findNodeById(data, prev)) return prev;
        return folders[1]?.id ?? folders[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const folders = useMemo(() => flattenFolders(tree), [tree]);
  const selectedFolder = useMemo(
    () => findNodeById(tree, selectedFolderId) ?? folders[0]?.node ?? null,
    [tree, selectedFolderId, folders],
  );

  const searchResults = useMemo(
    () => (query.trim() ? searchTreeLinks(tree, query) : null),
    [tree, query],
  );

  const folderItems = useMemo(() => {
    if (!selectedFolder?.children) return [];
    return selectedFolder.children.filter((c) => Boolean(c.url));
  }, [selectedFolder]);

  const subfolders = useMemo(() => {
    if (!selectedFolder?.children) return [];
    return selectedFolder.children.filter((c) => !c.url);
  }, [selectedFolder]);

  const flashStatus = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus((cur) => (cur === msg ? null : cur)), 3200);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode) return;
    setFormError(null);
    const parentId = selectedFolder?.id ?? folders[0]?.id;

    if (modalMode.kind === "create-folder") {
      if (!formTitle.trim()) {
        setFormError("Give the folder a name.");
        return;
      }
      if (!parentId) return;
      const updated = await createBookmarkNode({ parentId, title: formTitle.trim() });
      setTree(updated);
      setModalMode(null);
      flashStatus("Folder created.");
      return;
    }

    if (!formUrl.trim()) {
      setFormError("Enter a website address.");
      return;
    }
    const cleanUrl = normalizeUrl(formUrl);

    if (modalMode.kind === "create-bm") {
      if (!parentId) return;
      const updated = await createBookmarkNode({
        parentId,
        title: formTitle.trim() || extractDomain(cleanUrl),
        url: cleanUrl,
      });
      setTree(updated);
      setModalMode(null);
      flashStatus("Bookmark added.");
    } else if (modalMode.kind === "edit-bm") {
      const updated = await updateBookmarkNode(modalMode.node.id, {
        title: formTitle.trim() || extractDomain(cleanUrl),
        url: cleanUrl,
      });
      setTree(updated);
      setModalMode(null);
      flashStatus("Bookmark updated.");
    }
  };

  const handleDelete = async (node: BookmarkNode) => {
    const updated = await deleteBookmarkNode(node.id, !node.url);
    setTree(updated);
    flashStatus(node.url ? "Bookmark deleted." : "Folder deleted.");
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      flashStatus("Link copied to clipboard.");
    } catch {
      flashStatus("Could not copy link.");
    }
  };

  const handleOpenAsGroup = async () => {
    if (!selectedFolder) return;
    const msg = await openBookmarkFolderAsGroup(selectedFolder, settings.openInNewTab);
    flashStatus(msg);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/10 px-3 py-2.5 dark:border-white/10">
        <div className="relative min-w-[150px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all folders…"
            aria-label="Search bookmarks"
            className="w-full rounded-xl border border-slate-900/10 bg-white/70 py-1.5 pl-8 pr-7 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setFormTitle("");
              setFormUrl("");
              setFormError(null);
              setModalMode({ kind: "create-bm" });
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setFormTitle("");
              setFormUrl("");
              setFormError(null);
              setModalMode({ kind: "create-folder" });
            }}
            title="New folder"
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900/6 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/12 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Folder
          </button>
          <button
            type="button"
            onClick={handleOpenAsGroup}
            disabled={!selectedFolder}
            title="Open all links in this folder"
            className="hidden items-center gap-1 rounded-xl bg-slate-900/6 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/12 disabled:opacity-40 sm:inline-flex dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open group
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Reload bookmarks"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-900/8 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mode note / status banner */}
      {status && (
        <div
          role="status"
          className="border-b border-slate-900/10 bg-indigo-500/8 px-3 py-1.5 text-xs text-indigo-600 dark:border-white/10 dark:text-indigo-300"
        >
          {status}
        </div>
      )}

      {/* Inline form */}
      {modalMode && (
        <form
          onSubmit={handleSaveForm}
          className="space-y-2 border-b border-slate-900/10 bg-slate-900/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {modalMode.kind === "create-folder"
                ? "New Folder"
                : modalMode.kind === "edit-bm"
                  ? "Edit Bookmark"
                  : "Add Bookmark"}
            </span>
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={modalMode.kind === "create-folder" ? "Folder name" : "Title"}
              className="min-w-[140px] flex-1 rounded-xl border border-slate-900/10 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
            />
            {modalMode.kind !== "create-folder" && (
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com"
                className="min-w-[180px] flex-1 rounded-xl border border-slate-900/10 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
              />
            )}
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
          {formError && <p className="text-[11px] text-rose-500">{formError}</p>}
        </form>
      )}

      {/* Main split view */}
      <div className="flex min-h-0 flex-1">
        {/* Folder sidebar */}
        <nav
          aria-label="Bookmark folders"
          className="scroll-thin hidden w-48 shrink-0 overflow-y-auto border-r border-slate-900/10 p-2 sm:block dark:border-white/10"
        >
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {hasChromeBookmarks() ? "Chrome Folders" : "Local Folders"}
          </p>
          <ul className="space-y-0.5">
            {folders.map((f) => {
              const active = selectedFolder?.id === f.id && !searchResults;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolderId(f.id);
                      setQuery("");
                    }}
                    style={{ paddingLeft: `${8 + Math.min(f.depth, 3) * 12}px` }}
                    className={`flex w-full items-center gap-1.5 rounded-xl py-1.5 pr-2 text-left text-xs transition ${
                      active
                        ? "bg-indigo-500/15 font-medium text-indigo-600 dark:text-indigo-300"
                        : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/8"
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    <span className="truncate">{f.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bookmark list */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile folder selector */}
          <div className="border-b border-slate-900/10 px-3 py-2 sm:hidden dark:border-white/10">
            <select
              value={selectedFolder?.id ?? ""}
              onChange={(e) => {
                setSelectedFolderId(e.target.value);
                setQuery("");
              }}
              aria-label="Select bookmark folder"
              className="w-full rounded-xl border border-slate-900/10 bg-white/70 px-2.5 py-1 text-xs dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2.5">
            {searchResults ? (
              searchResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No bookmarks match "{query.trim()}".
                </div>
              ) : (
                <ul className="space-y-1">
                  {searchResults.map(({ node, path }) => (
                    <li
                      key={node.id}
                      className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-900/5 dark:hover:bg-white/6"
                    >
                      <FaviconBadge url={node.url!} label={node.title} size="sm" />
                      <button
                        type="button"
                        onClick={() => openUrl(node.url!, node.title)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                          {node.title}
                        </p>
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {extractDomain(node.url!)}
                          {path ? ` · ${path}` : ""}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(node.url!, node.title)}
                        aria-label="Toggle favorite"
                        className={`grid h-7 w-7 place-items-center rounded-lg ${
                          isFavorite(node.url!) ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
                        }`}
                      >
                        <Star
                          className="h-3.5 w-3.5"
                          fill={isFavorite(node.url!) ? "currentColor" : "none"}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="space-y-2">
                {subfolders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {subfolders.map((sf) => (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => setSelectedFolderId(sf.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/14"
                      >
                        <Folder className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{sf.title}</span>
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      </button>
                    ))}
                  </div>
                )}

                {folderItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <Bookmark className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      This folder is empty
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Click "Add" above to bookmark a site in this folder.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {folderItems.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-900/5 dark:hover:bg-white/6"
                      >
                        <FaviconBadge url={item.url!} label={item.title} size="sm" />
                        <button
                          type="button"
                          onClick={() => openUrl(item.url!, item.title)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                            {item.title}
                          </p>
                          <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {extractDomain(item.url!)}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(item.url!, item.title)}
                            aria-label="Toggle favorite"
                            className={`grid h-6 w-6 place-items-center rounded-md ${
                              isFavorite(item.url!)
                                ? "text-amber-400"
                                : "text-slate-400 hover:text-amber-400"
                            }`}
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={isFavorite(item.url!) ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopy(item.url!)}
                            aria-label="Copy link"
                            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormTitle(item.title);
                              setFormUrl(item.url ?? "");
                              setFormError(null);
                              setModalMode({ kind: "edit-bm", node: item });
                            }}
                            aria-label="Edit bookmark"
                            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-indigo-500"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            aria-label="Delete bookmark"
                            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
