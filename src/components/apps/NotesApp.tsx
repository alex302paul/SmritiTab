import { Pin, Plus, Trash2, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { formatRelativeTime } from "../../services/browserApi";

export function NotesApp() {
  const { notes, addNote, updateNote, deleteNote } = useSmriti();
  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) =>
        a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt - a.updatedAt,
      ),
    [notes],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => sortedNotes[0]?.id ?? null);
  const selected = useMemo(
    () => sortedNotes.find((n) => n.id === selectedId) ?? sortedNotes[0] ?? null,
    [sortedNotes, selectedId],
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  const handleCreate = () => {
    const created = addNote({ title: "Untitled note", body: "" });
    setSelectedId(created.id);
  };

  const handleDelete = () => {
    if (!selected) return;
    const next = sortedNotes.find((n) => n.id !== selected.id);
    deleteNote(selected.id);
    setSelectedId(next?.id ?? null);
  };

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-500">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No notes yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Notes save automatically to local storage as you type.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New note
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar list */}
      <aside className="flex w-44 shrink-0 flex-col border-r border-slate-900/10 dark:border-white/10 sm:w-52">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
          <button
            type="button"
            onClick={handleCreate}
            aria-label="New note"
            title="New note"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-900/5 hover:text-indigo-500 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <ul className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {sortedNotes.map((note) => {
            const active = selected?.id === note.id;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={`w-full rounded-xl px-2.5 py-2 text-left transition ${
                    active
                      ? "bg-indigo-500/12 text-slate-900 dark:bg-indigo-500/20 dark:text-white"
                      : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {note.pinned && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    )}
                    <span className="truncate text-xs font-medium">
                      {note.title || "Untitled note"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {note.body ? note.body.slice(0, 36) : "Empty note"} ·{" "}
                    {formatRelativeTime(note.updatedAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Editor */}
      {selected ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-slate-900/10 px-3 py-2 dark:border-white/10">
            <input
              type="text"
              value={selected.title}
              onChange={(e) => updateNote(selected.id, { title: e.target.value })}
              placeholder="Note title…"
              aria-label="Note title"
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              type="button"
              onClick={() => updateNote(selected.id, { pinned: !selected.pinned })}
              aria-label={selected.pinned ? "Unpin note" : "Pin note"}
              aria-pressed={selected.pinned}
              title={selected.pinned ? "Unpin note" : "Pin note"}
              className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                selected.pinned
                  ? "bg-orange-500/15 text-orange-500"
                  : "text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete note"
              title="Delete note"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            value={selected.body}
            onChange={(e) => updateNote(selected.id, { body: e.target.value })}
            placeholder="Write something…"
            aria-label="Note body"
            className="scroll-thin min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>
      ) : null}
    </div>
  );
}
