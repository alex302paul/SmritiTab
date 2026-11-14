import { History, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import {
  extractDomain,
  formatRelativeTime,
  hasChromeHistory,
  searchHistoryItems,
} from "../../services/browserApi";
import type { HistoryEntry } from "../../types/smrititab";
import { FaviconBadge } from "../FaviconBadge";

type TimeRange = "day" | "week" | "month" | "all";

const RANGE_LABELS: Record<TimeRange, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  all: "All time",
};

const RANGE_MS: Record<TimeRange, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: 0,
};

export function HistoryApp() {
  const { openUrl } = useSmriti();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<TimeRange>("week");
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = range === "all" ? undefined : Date.now() - RANGE_MS[range];
      const data = await searchHistoryItems({ text: query, maxResults: 80, startTime });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [query, range]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 120);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-900/10 p-3 dark:border-white/10">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter history…"
          aria-label="Filter history"
          className="min-w-0 flex-1 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
        />
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as TimeRange)}
          aria-label="History time range"
          className="rounded-xl border border-slate-900/10 bg-white/70 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200"
        >
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((k) => (
            <option key={k} value={k}>
              {RANGE_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Reload history"
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-900/8 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2.5">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <History className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No recent visits found
            </p>
            <p className="max-w-xs text-[11px] text-slate-400 dark:text-slate-500">
              {hasChromeHistory()
                ? "Try expanding the time range or clearing your search filter."
                : "Links you launch from Quick Links, Launchpad, Search, or Bookmarks appear here automatically."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openUrl(item.url, item.title)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-900/5 dark:hover:bg-white/6"
                >
                  <FaviconBadge url={item.url} label={item.title} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {extractDomain(item.url)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                    {formatRelativeTime(item.lastVisitTime)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
