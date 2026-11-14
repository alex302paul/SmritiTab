import { Check, Clipboard, ClipboardPaste, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { formatRelativeTime } from "../../services/browserApi";

export function ClipboardApp() {
  const { clipboard, addClipboardEntry, removeClipboardEntry, clearClipboardEntries } = useSmriti();
  const [draft, setDraft] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasClipboardApi =
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText);

  const handleReadSystemClipboard = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setStatusMsg("Your system clipboard is empty.");
      } else {
        addClipboardEntry(text);
        setStatusMsg("Saved from system clipboard.");
      }
    } catch {
      setStatusMsg(
        "Clipboard read permission was denied — paste directly into the box below with Ctrl+V / ⌘V.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      setStatusMsg("Could not copy to clipboard.");
    }
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addClipboardEntry(draft);
    setDraft("");
    setStatusMsg(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2.5 border-b border-slate-900/10 p-3 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!hasClipboardApi || busy}
            onClick={handleReadSystemClipboard}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste from clipboard
          </button>
          {clipboard.length > 0 && (
            <button
              type="button"
              onClick={clearClipboardEntries}
              className="ml-auto inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {statusMsg && (
          <p role="status" className="text-[11px] text-amber-600 dark:text-amber-400">
            {statusMsg}
          </p>
        )}

        <form onSubmit={handleSaveDraft} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste or type a snippet to keep locally…"
            aria-label="Clipboard snippet"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/8 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/15 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <Plus className="h-3.5 w-3.5" />
            Save snippet
          </button>
        </form>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        {clipboard.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Clipboard className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No snippets yet</p>
            <p className="max-w-xs text-[11px] text-slate-400 dark:text-slate-500">
              Saved snippets stay on your device so you can re-copy them anytime.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {clipboard.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-900/8 bg-slate-900/[0.03] px-3 py-2.5 transition hover:border-slate-900/15 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/15"
              >
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {entry.text}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.id, entry.text)}
                      aria-label="Copy snippet"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-slate-900/10 hover:text-indigo-500 dark:text-slate-400 dark:hover:bg-white/10"
                    >
                      {copiedId === entry.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClipboardEntry(entry.id)}
                      aria-label="Delete snippet"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
