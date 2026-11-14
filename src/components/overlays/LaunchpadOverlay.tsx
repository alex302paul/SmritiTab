import { CloudSun, ExternalLink, Maximize2, Search, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { LAUNCHPAD_GROUPS } from "../../data/defaults";
import { FaviconBadge } from "../FaviconBadge";

export function LaunchpadOverlay() {
  const { openUrl, openInternalApp, openOverlay, closeOverlay } = useSmriti();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LAUNCHPAD_GROUPS;
    return LAUNCHPAD_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.name} ${item.description} ${group.title}`.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    /* Separate opaque launcher panel — wallpaper stays completely sharp behind */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App Launchpad"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay();
      }}
      className="animate-smriti-fade fixed inset-0 z-[200] flex items-center justify-center bg-black/28 p-4 sm:p-6"
    >
      <div className="smriti-opaque-panel animate-smriti-scale flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Launchpad
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Google Apps · AI Apps · Social Media
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps…"
              aria-label="Search Launchpad apps"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 dark:border-white/12 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Close Launchpad"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body: 3 Distinct Columns on Desktop */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-6">
          {filteredGroups.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No apps match "{query}"
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Show all apps
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <section
                  key={group.id}
                  aria-label={group.title}
                  className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#141a28]"
                >
                  <div className="mb-3.5 border-b border-slate-200/80 pb-2.5 dark:border-white/8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {group.title}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {group.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          openUrl(item.url, item.name);
                          closeOverlay();
                        }}
                        className="group flex items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-2.5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-md dark:bg-[#1b2334] dark:hover:border-orange-500/45 dark:hover:bg-[#222c42]"
                      >
                        <FaviconBadge
                          url={item.url}
                          label={item.name}
                          fallbackText={item.mark}
                          accent={item.accent}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer quick SmritiTab utilities */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-white/10 dark:bg-[#0b0f18]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tools:
            </span>
            <button
              type="button"
              onClick={() => {
                closeOverlay();
                openInternalApp("favorites");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-[#141a28] dark:text-slate-200 dark:hover:text-indigo-300"
            >
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Favorites
            </button>
            <button
              type="button"
              onClick={() => {
                closeOverlay();
                openInternalApp("weather");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-[#141a28] dark:text-slate-200 dark:hover:text-indigo-300"
            >
              <CloudSun className="h-3.5 w-3.5 text-sky-400" />
              Weather
            </button>
            <button
              type="button"
              onClick={() => openOverlay("focus")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-[#141a28] dark:text-slate-200 dark:hover:text-indigo-300"
            >
              <Maximize2 className="h-3.5 w-3.5 text-orange-400" />
              Focus Mode
            </button>
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            Press <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-white/10 dark:text-slate-300">Esc</kbd> to close
          </span>
        </footer>
      </div>
    </div>
  );
}
