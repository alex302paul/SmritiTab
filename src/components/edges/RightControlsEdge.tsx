import { Settings, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { useHoverReveal, useIsTouchDevice } from "../../hooks/useHoverReveal";
import { getInitials } from "../../services/browserApi";

export function RightControlsEdge() {
  const { activeOverlay, openOverlay, profile } = useSmriti();
  const isTouch = useIsTouchDevice();
  const containerRef = useRef<HTMLDivElement>(null);
  const disabled = activeOverlay !== null;

  const reveal = useHoverReveal({
    disabled,
    closeDelayMs: 300,
  });

  useEffect(() => {
    if (!reveal.pinned) return;
    const onOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        reveal.close();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [reveal]);

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
      className={`fixed right-0 top-1/2 z-[140] flex h-48 -translate-y-1/2 items-center justify-end ${
        reveal.visible ? "pointer-events-auto w-auto pl-4" : "pointer-events-none w-8"
      }`}
    >
      {/* Right-center edge proximity strip */}
      <div
        aria-hidden={!isTouch}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") reveal.enter();
        }}
        className="pointer-events-auto absolute inset-y-0 right-0 flex w-7 items-center justify-end"
      >
        {isTouch && !reveal.visible && (
          <button
            type="button"
            onClick={reveal.togglePinned}
            aria-label="Show Settings and Profile"
            className="flex h-24 w-11 items-center justify-end pr-2 focus-visible:outline-orange-500"
          >
            <span className="h-14 w-1.5 rounded-full bg-white/55 shadow-sm backdrop-blur-md transition active:scale-95" />
          </button>
        )}
      </div>

      {/* Smoothly gliding Right Controls Capsule (Settings & Profile) */}
      <div
        className={`pr-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          reveal.visible
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none translate-x-6 opacity-0"
        }`}
      >
        <div
          aria-label="Settings and Profile controls"
          className="smriti-glass flex flex-col gap-1.5 rounded-2xl p-1.5 text-white"
        >
          <button
            type="button"
            onClick={() => {
              reveal.close();
              openOverlay("settings");
            }}
            aria-label="Open Settings"
            title="Settings"
            className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/12 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition group-hover:bg-indigo-500 group-hover:text-white">
              <Settings className="h-4 w-4" />
            </span>
            <span className="pr-1 text-xs font-medium text-white/90 group-hover:text-white">
              Settings
            </span>
          </button>

          <div className="mx-2 h-px bg-white/10" aria-hidden="true" />

          <button
            type="button"
            onClick={() => {
              reveal.close();
              openOverlay("profile");
            }}
            aria-label="Open Profile"
            title={`Profile (${profile.name})`}
            className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/12 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-semibold text-white shadow-sm">
              {profile.name && profile.name !== "Guest" ? (
                getInitials(profile.name)
              ) : (
                <User className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 pr-1">
              <span className="block max-w-[92px] truncate text-xs font-medium text-white/90 group-hover:text-white">
                {profile.name || "Profile"}
              </span>
              <span className="block text-[10px] text-white/55">Profile</span>
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
