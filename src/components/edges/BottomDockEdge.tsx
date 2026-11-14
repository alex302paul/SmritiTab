import { Grip } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { APP_REGISTRY } from "../../data/defaults";
import { useHoverReveal, useIsTouchDevice } from "../../hooks/useHoverReveal";
import type { InternalAppId } from "../../types/smrititab";
import { AppIcon } from "../AppIcon";
import { FaviconBadge } from "../FaviconBadge";

const SIZE_STYLES = {
  sm: { button: "h-10 w-10 rounded-xl", icon: "h-4 w-4" },
  md: { button: "h-12 w-12 rounded-2xl", icon: "h-5 w-5" },
  lg: { button: "h-14 w-14 rounded-2xl", icon: "h-6 w-6" },
};

export function BottomDockEdge() {
  const {
    settings,
    dock,
    apps,
    activeOverlay,
    openOverlay,
    openApp,
    openInternalApp,
    hasOpenWindow,
  } = useSmriti();

  const isTouch = useIsTouchDevice();
  const containerRef = useRef<HTMLDivElement>(null);
  const disabled = activeOverlay !== null || !settings.dockVisible;

  const reveal = useHoverReveal({
    disabled,
    closeDelayMs: 320,
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

  const dockItems = useMemo(() => {
    return dock.appIds
      .map((id) => {
        const webApp = apps.find((a) => a.id === id);
        if (webApp) {
          return {
            key: webApp.id,
            label: webApp.name,
            kind: "web" as const,
            url: webApp.target,
            iconText: webApp.iconText,
            accent: "#6366f1",
            running: false,
            activate: () => openApp(webApp),
          };
        }
        const meta = APP_REGISTRY[id as InternalAppId];
        if (!meta) return null;
        const internalId = id as InternalAppId;
        return {
          key: internalId,
          label: meta.title,
          kind: "internal" as const,
          appId: internalId,
          accent: meta.accent,
          running: hasOpenWindow(internalId),
          activate: () => openInternalApp(internalId),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dock.appIds, apps, openApp, openInternalApp, hasOpenWindow]);

  if (disabled) return null;

  const dims = SIZE_STYLES[dock.size] ?? SIZE_STYLES.md;

  return (
    <div
      ref={containerRef}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch" && reveal.visible) reveal.enter();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") reveal.leave();
      }}
      className={`fixed bottom-0 left-1/2 z-[140] flex max-w-[96vw] -translate-x-1/2 flex-col items-center justify-end ${
        reveal.visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Smoothly sliding Dock */}
      <div
        className={`pb-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          reveal.visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-12 opacity-0"
        }`}
      >
        <nav
          aria-label="Dock"
          className="smriti-glass scroll-thin flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-x-auto rounded-3xl px-2.5 py-2 text-white"
        >
          {dockItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                item.activate();
                if (isTouch) reveal.close();
              }}
              aria-label={item.label}
              title={item.label}
              className="group relative flex shrink-0 flex-col items-center gap-1 rounded-2xl px-0.5 transition focus-visible:outline-orange-500"
            >
              <span
                className={`relative grid place-items-center bg-white/10 text-white/90 transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:bg-white/20 group-hover:text-white active:scale-95 ${dims.button}`}
              >
                {item.kind === "web" ? (
                  <FaviconBadge
                    url={item.url}
                    label={item.label}
                    fallbackText={item.iconText}
                    size="sm"
                  />
                ) : (
                  <AppIcon appId={item.appId} className={dims.icon} />
                )}
                {item.running && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.9)]"
                  />
                )}
              </span>
              {dock.labels && (
                <span className="max-w-[56px] truncate text-[10px] font-medium text-white/80">
                  {item.label}
                </span>
              )}
            </button>
          ))}

          {/* Divider before Launchpad Menu button */}
          <span
            aria-hidden="true"
            className="mx-1 h-8 w-px shrink-0 bg-white/15"
          />

          {/* Launchpad Menu Button */}
          <button
            type="button"
            onClick={() => {
              reveal.close();
              openOverlay("launchpad");
            }}
            aria-label="Open Launchpad Menu"
            title="Launchpad Menu"
            className="group relative flex shrink-0 flex-col items-center gap-1 rounded-2xl px-0.5 transition"
          >
            <span
              className={`grid place-items-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:from-orange-500 group-hover:to-rose-500 active:scale-95 ${dims.button}`}
            >
              <Grip className={dims.icon} />
            </span>
            {dock.labels && (
              <span className="text-[10px] font-medium text-white/85">Menu</span>
            )}
          </button>
        </nav>
      </div>

      {/* Generous invisible bottom-center hover corridor (+ minimal touch bar on mobile) */}
      <div
        aria-hidden={!isTouch}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") reveal.enter();
        }}
        onClick={() => {
          if (isTouch) reveal.togglePinned();
        }}
        className={`pointer-events-auto flex w-[min(560px,84vw)] items-end justify-center ${
          reveal.visible ? "h-2" : "h-7"
        }`}
      >
        {isTouch && !reveal.visible && (
          <button
            type="button"
            onClick={reveal.togglePinned}
            aria-label="Show Dock"
            className="flex h-11 w-28 items-end justify-center pb-2 focus-visible:outline-orange-500"
          >
            <span className="h-1.5 w-16 rounded-full bg-white/55 shadow-sm backdrop-blur-md transition active:scale-95" />
          </button>
        )}
      </div>
    </div>
  );
}
