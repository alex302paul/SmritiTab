import { Minimize2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { QUOTES } from "../../data/defaults";
import { formatClock, getGreeting } from "../../services/browserApi";

export function FocusOverlay() {
  const { settings, profile, closeOverlay } = useSmriti();
  const [now, setNow] = useState(() => new Date());
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(new Date()),
      settings.showSecondsInClock ? 1000 : 15000,
    );
    return () => window.clearInterval(interval);
  }, [settings.showSecondsInClock]);

  const quote = QUOTES[quoteIdx % QUOTES.length];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      className="animate-smriti-fade fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/32 px-6 text-center"
    >
      <p className="font-mono text-6xl font-semibold tracking-tight text-white tabular-nums drop-shadow-xl sm:text-8xl">
        {formatClock(now, {
          hour24: settings.clock24h,
          seconds: settings.showSecondsInClock,
        })}
      </p>

      {settings.showGreeting && (
        <p className="mt-3 text-base font-medium text-white/90 drop-shadow">
          {getGreeting(now)}, {profile.name}
        </p>
      )}

      <p className="mt-1 text-xs tracking-wide text-white/70">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="mt-8 max-w-md">
        <p className="text-sm italic leading-relaxed text-white/85 drop-shadow">
          “{quote.text}”
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-white/60">
          <span>— {quote.author}</span>
          <button
            type="button"
            onClick={() => setQuoteIdx((i) => (i + 1) % QUOTES.length)}
            aria-label="Next quote"
            className="rounded-md p-1 transition hover:bg-white/15 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={closeOverlay}
        className="mt-10 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/45 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-slate-950/65"
      >
        <Minimize2 className="h-3.5 w-3.5" />
        Exit focus mode
        <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
      </button>
    </div>
  );
}
