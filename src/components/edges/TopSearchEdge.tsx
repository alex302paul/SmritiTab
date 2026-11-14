import { Check, Mic, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { SEARCH_PROVIDERS } from "../../data/defaults";
import { useHoverReveal, useIsTouchDevice } from "../../hooks/useHoverReveal";
import {
  buildSearchUrl,
  extractDomain,
  getFaviconUrl,
  getSearchProvider,
  searchAllBookmarks,
  searchHistoryItems,
} from "../../services/browserApi";
import type { SearchEngineId } from "../../types/smrititab";
import { FaviconBadge } from "../FaviconBadge";

interface SuggestionItem {
  id: string;
  title: string;
  url: string;
  source: "Quick Link" | "Bookmark" | "History" | "Favorite";
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function TopSearchEdge() {
  const {
    settings,
    updateSettings,
    apps,
    favorites,
    openUrl,
    activeOverlay,
    searchFocusSignal,
  } = useSmriti();

  const isTouch = useIsTouchDevice();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [providerHighlight, setProviderHighlight] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const disabled = activeOverlay !== null;
  const locked = focused || providerMenuOpen || listening || query.trim().length > 0;

  const reveal = useHoverReveal({
    disabled,
    locked,
    closeDelayMs: 320,
  });

  const provider = getSearchProvider(settings.searchEngine);
  const speechSupported = getSpeechRecognitionCtor() !== null;

  const focusInput = useCallback(() => {
    reveal.openPinned();
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
  }, [reveal]);

  // Respond to external focus requests (service-worker open-search command)
  useEffect(() => {
    if (searchFocusSignal > 0 && !disabled) {
      focusInput();
    }
  }, [searchFocusSignal, disabled, focusInput]);

  // Global keyboard shortcuts: "/" and Ctrl/Cmd + K
  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusInput();
        return;
      }

      if (!inEditable && e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, focusInput]);

  // Close search when tapping outside on touch / pinned mode
  useEffect(() => {
    if (!reveal.visible) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setProviderMenuOpen(false);
        setSuggestions([]);
        setFocused(false);
        if (!query.trim()) {
          reveal.close();
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [reveal, query]);

  // Reset transient search dropdowns if a major overlay opens
  useEffect(() => {
    if (disabled) {
      setProviderMenuOpen(false);
      setSuggestions([]);
      setFocused(false);
    }
  }, [disabled]);

  // Live suggestions from Quick Links, Favorites, Bookmarks & History
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setActiveSuggestion(-1);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const lower = q.toLowerCase();
      const [bookmarks, history] = await Promise.all([
        searchAllBookmarks(q),
        searchHistoryItems({
          text: q,
          maxResults: 6,
          startTime: Date.now() - 90 * 24 * 60 * 60 * 1000,
        }),
      ]);
      if (cancelled) return;

      const seen = new Set<string>();
      const out: SuggestionItem[] = [];

      const pushUnique = (item: SuggestionItem) => {
        if (!item.url || seen.has(item.url)) return;
        seen.add(item.url);
        out.push(item);
      };

      for (const app of apps) {
        if (app.kind === "web" && `${app.name} ${app.target}`.toLowerCase().includes(lower)) {
          pushUnique({ id: app.id, title: app.name, url: app.target, source: "Quick Link" });
        }
      }
      for (const fav of favorites) {
        if (`${fav.title} ${fav.url}`.toLowerCase().includes(lower)) {
          pushUnique({ id: fav.id, title: fav.title, url: fav.url, source: "Favorite" });
        }
      }
      for (const bm of bookmarks) {
        pushUnique({ id: bm.id, title: bm.title, url: bm.url, source: "Bookmark" });
      }
      for (const hist of history) {
        pushUnique({ id: hist.id, title: hist.title, url: hist.url, source: "History" });
      }

      setSuggestions(out.slice(0, 7));
      setActiveSuggestion(-1);
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, apps, favorites]);

  const submitQuery = useCallback(
    (raw: string, engine: SearchEngineId = settings.searchEngine) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const url = buildSearchUrl(engine, trimmed);
      setQuery("");
      setSuggestions([]);
      setProviderMenuOpen(false);
      setFocused(false);
      inputRef.current?.blur();
      reveal.close();
      openUrl(url, trimmed);
    },
    [settings.searchEngine, openUrl, reveal],
  );

  const stopVoice = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    setListening(false);
  }, []);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const toggleVoice = () => {
    setVoiceError(null);
    if (recognitionRef.current) {
      stopVoice();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError("Voice search is not supported in this browser.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = settings.voiceLanguage || "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => setListening(true);
      rec.onresult = (event) => {
        let text = "";
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const res = event.results[i];
          text += res[0]?.transcript ?? "";
          if (res.isFinal) isFinal = true;
        }
        const trimmed = text.trim();
        if (trimmed) {
          setQuery(trimmed);
          if (isFinal) submitQuery(trimmed);
        }
      };
      rec.onerror = (ev) => {
        setVoiceError(
          ev.error === "not-allowed"
            ? "Microphone permission denied."
            : `Voice search error (${ev.error}).`,
        );
        stopVoice();
      };
      rec.onend = () => stopVoice();
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setVoiceError("Could not start voice search.");
      stopVoice();
    }
  };

  const selectEngine = (id: SearchEngineId) => {
    updateSettings({ searchEngine: id });
    setProviderMenuOpen(false);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (suggestions.length > 0) {
        setSuggestions([]);
        return;
      }
      if (providerMenuOpen) {
        setProviderMenuOpen(false);
        return;
      }
      if (query) {
        setQuery("");
        return;
      }
      setFocused(false);
      inputRef.current?.blur();
      reveal.close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const chosen = suggestions[activeSuggestion];
      if (chosen) {
        setQuery("");
        setSuggestions([]);
        setFocused(false);
        inputRef.current?.blur();
        reveal.close();
        openUrl(chosen.url, chosen.title);
      } else {
        submitQuery(query);
      }
    }
  };

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch" && reveal.visible) reveal.enter();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") reveal.leave();
      }}
      className={`fixed left-1/2 top-0 z-[140] flex w-[min(92vw,660px)] -translate-x-1/2 flex-col items-center ${
        reveal.visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Generous invisible top-center edge hover corridor */}
      <div
        aria-hidden={!isTouch}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") reveal.enter();
        }}
        onClick={() => {
          if (isTouch) focusInput();
        }}
        className={`pointer-events-auto flex w-full items-start justify-center ${
          reveal.visible ? "h-4" : "h-7"
        }`}
      >
        {/* Whisper-thin tap handle shown ONLY on touch/mobile devices (44px tap target) */}
        {isTouch && !reveal.visible && (
          <button
            type="button"
            onClick={focusInput}
            aria-label="Open search"
            className="flex h-11 w-24 items-start justify-center pt-2 focus-visible:outline-orange-500"
          >
            <span className="h-1.5 w-14 rounded-full bg-white/55 shadow-sm backdrop-blur-md transition active:scale-95" />
          </button>
        )}
      </div>

      {/* Smoothly sliding Search Bar */}
      <div
        className={`w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          reveal.visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-8 opacity-0"
        }`}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(query);
          }}
          className="smriti-glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-white transition focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-500/30"
        >
          <Search className="ml-0.5 h-4 w-4 shrink-0 text-white/60" />

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setFocused(true);
              reveal.enter();
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search the web"
            placeholder={`Search ${provider.label} or enter URL…  (/ or ⌘K)`}
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/45"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Provider switcher button */}
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={providerMenuOpen}
            aria-label={`Search engine: ${provider.label}. Change search engine`}
            title={`Search engine: ${provider.label}`}
            onClick={() => {
              setProviderMenuOpen((prev) => !prev);
              setProviderHighlight(
                Math.max(
                  0,
                  SEARCH_PROVIDERS.findIndex((p) => p.id === provider.id),
                ),
              );
            }}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-white/8 px-2 transition hover:bg-white/15"
          >
            <img
              src={getFaviconUrl(provider.domain, 64)}
              alt=""
              width={18}
              height={18}
              className="h-4 w-4 rounded-sm"
            />
            <span className="hidden text-xs font-medium text-white/85 sm:inline">
              {provider.label}
            </span>
          </button>

          {/* Voice Search */}
          <button
            type="button"
            disabled={!speechSupported}
            aria-label={listening ? "Stop voice search" : "Start voice search"}
            aria-pressed={listening}
            title={
              speechSupported
                ? listening
                  ? "Stop voice search"
                  : "Voice search"
                : "Voice search unavailable in this browser"
            }
            onClick={toggleVoice}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
              !speechSupported
                ? "cursor-not-allowed text-white/25"
                : listening
                  ? "animate-pulse-ring bg-orange-500/25 text-orange-300"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
        </form>

        {voiceError && (
          <p
            role="alert"
            className="smriti-glass mt-2 rounded-xl px-3 py-1.5 text-xs text-amber-300"
          >
            {voiceError}
          </p>
        )}

        {/* Search provider dropdown */}
        {providerMenuOpen && (
          <div
            role="listbox"
            aria-label="Search engines"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setProviderHighlight((i) => (i + 1) % SEARCH_PROVIDERS.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setProviderHighlight(
                  (i) => (i - 1 + SEARCH_PROVIDERS.length) % SEARCH_PROVIDERS.length,
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                selectEngine(SEARCH_PROVIDERS[providerHighlight].id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setProviderMenuOpen(false);
                inputRef.current?.focus();
              }
            }}
            className="smriti-glass animate-smriti-scale mt-2 overflow-hidden rounded-2xl p-1.5 text-white"
          >
            {SEARCH_PROVIDERS.map((eng, idx) => (
              <button
                key={eng.id}
                type="button"
                role="option"
                aria-selected={eng.id === provider.id}
                onMouseEnter={() => setProviderHighlight(idx)}
                onClick={() => selectEngine(eng.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                  idx === providerHighlight ? "bg-white/12" : "hover:bg-white/10"
                }`}
              >
                <img
                  src={getFaviconUrl(eng.domain, 64)}
                  alt=""
                  width={18}
                  height={18}
                  className="h-4 w-4 rounded-sm"
                />
                <span className="flex-1 text-white/90">{eng.label}</span>
                {eng.id === provider.id && <Check className="h-3.5 w-3.5 text-orange-400" />}
              </button>
            ))}
          </div>
        )}

        {/* Live Suggestions dropdown */}
        {!providerMenuOpen && suggestions.length > 0 && query.trim() && (
          <div
            role="listbox"
            aria-label="Bookmark, history, and quick link suggestions"
            className="smriti-glass animate-smriti-scale mt-2 overflow-hidden rounded-2xl p-1.5 text-white"
          >
            {suggestions.map((item, idx) => (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                role="option"
                aria-selected={idx === activeSuggestion}
                onMouseEnter={() => setActiveSuggestion(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setFocused(false);
                  reveal.close();
                  openUrl(item.url, item.title);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  idx === activeSuggestion ? "bg-orange-500/20" : "hover:bg-white/10"
                }`}
              >
                <FaviconBadge url={item.url} label={item.title} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">
                    {item.title}
                  </span>
                  <span className="block truncate text-[10px] text-white/55">
                    {extractDomain(item.url)}
                  </span>
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/75">
                  {item.source}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
