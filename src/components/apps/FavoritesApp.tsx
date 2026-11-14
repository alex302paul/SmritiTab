import { Plus, Star } from "lucide-react";
import { useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { extractDomain, normalizeUrl } from "../../services/browserApi";
import { FaviconBadge } from "../FaviconBadge";

export function FavoritesApp() {
  const { favorites, toggleFavorite, openUrl } = useSmriti();
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) {
      setError("Enter a website address.");
      return;
    }
    const clean = normalizeUrl(raw);
    if (!/^https?:\/\//i.test(clean)) {
      setError("Only http and https addresses can be saved.");
      return;
    }
    toggleFavorite(clean, titleInput.trim() || extractDomain(clean));
    setUrlInput("");
    setTitleInput("");
    setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form
        onSubmit={handleAdd}
        className="space-y-2 border-b border-slate-900/10 p-3 dark:border-white/10"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            aria-label="Favorite site address"
            className="min-w-0 flex-1 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Favorite title"
          className="w-full rounded-xl border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
        />
        {error && <p className="text-[11px] text-rose-500">{error}</p>}
      </form>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2.5">
        {favorites.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Star className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No favorites yet
            </p>
            <p className="text-[11px] text-slate-400">Pin links you want one click away.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {favorites.map((fav) => (
              <li
                key={fav.id}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-900/5 dark:hover:bg-white/6"
              >
                <FaviconBadge url={fav.url} label={fav.title} size="sm" />
                <button
                  type="button"
                  onClick={() => openUrl(fav.url, fav.title)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                    {fav.title}
                  </p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {extractDomain(fav.url)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(fav.url, fav.title)}
                  aria-label={`Remove ${fav.title} from favorites`}
                  className="grid h-7 w-7 place-items-center rounded-lg text-amber-400 hover:bg-amber-400/10"
                >
                  <Star className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
