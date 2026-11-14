import { LayoutGrid } from "lucide-react";
import { useSmriti } from "../../context/SmritiContext";
import { useHoverReveal, useIsTouchDevice } from "../../hooks/useHoverReveal";

export function LeftQuickLinksEdge() {
  const { activeOverlay, openOverlay, apps } = useSmriti();
  const isTouch = useIsTouchDevice();
  const disabled = activeOverlay !== null;

  const reveal = useHoverReveal({
    disabled,
    closeDelayMs: 280,
  });

  if (disabled) return null;

  return (
    <div
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch" && reveal.visible) reveal.enter();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") reveal.leave();
      }}
      className={`fixed left-0 top-1/2 z-[140] flex h-44 -translate-y-1/2 items-center ${
        reveal.visible ? "pointer-events-auto w-auto pr-4" : "pointer-events-none w-8"
      }`}
    >
      {/* Edge proximity trigger strip */}
      <div
        aria-hidden={!isTouch}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") reveal.enter();
        }}
        className="pointer-events-auto absolute inset-y-0 left-0 flex w-7 items-center"
      >
        {/* Whisper-subtle touch handle ONLY on mobile/touch devices (44px tap target) */}
        {isTouch && !reveal.visible && (
          <button
            type="button"
            onClick={() => openOverlay("quicklinks")}
            aria-label="Open Quick Links"
            className="flex h-24 w-11 items-center justify-start pl-2 focus-visible:outline-orange-500"
          >
            <span className="h-14 w-1.5 rounded-full bg-white/55 shadow-sm backdrop-blur-md transition active:scale-95" />
          </button>
        )}
      </div>

      {/* Smoothly gliding Quick Links edge button */}
      <div
        className={`pl-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          reveal.visible
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-6 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            reveal.close();
            openOverlay("quicklinks");
          }}
          aria-label="Open Quick Links"
          className="smriti-glass group flex items-center gap-2.5 rounded-2xl px-4 py-3 text-white transition hover:border-orange-400/50 hover:bg-slate-900/85 active:scale-[0.98]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm transition group-hover:scale-105">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="pr-1 text-left">
            <span className="block text-xs font-semibold tracking-tight text-white">
              Quick Links
            </span>
            <span className="block text-[10px] text-white/60">
              {apps.length} saved
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
