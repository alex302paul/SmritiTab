import { Minus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { APP_REGISTRY } from "../../data/defaults";
import type { AppWindow, InternalAppId } from "../../types/smrititab";
import { AppIcon } from "../AppIcon";
import { BookmarksApp } from "../apps/BookmarksApp";
import { CalculatorApp } from "../apps/CalculatorApp";
import { ClipboardApp } from "../apps/ClipboardApp";
import { FavoritesApp } from "../apps/FavoritesApp";
import { HistoryApp } from "../apps/HistoryApp";
import { NotesApp } from "../apps/NotesApp";
import { TodoApp } from "../apps/TodoApp";
import { WeatherApp } from "../apps/WeatherApp";

function renderAppBody(appId: InternalAppId) {
  switch (appId) {
    case "notes":
      return <NotesApp />;
    case "todo":
      return <TodoApp />;
    case "calculator":
      return <CalculatorApp />;
    case "bookmarks":
      return <BookmarksApp />;
    case "history":
      return <HistoryApp />;
    case "clipboard":
      return <ClipboardApp />;
    case "favorites":
      return <FavoritesApp />;
    case "weather":
      return <WeatherApp />;
    default:
      return null;
  }
}

function FloatingWindow({ win }: { win: AppWindow }) {
  const { closeWindow, focusWindow, toggleMinimizeWindow, updateWindowGeometry } = useSmriti();
  const dragOrigin = useRef<{
    kind: "move" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const origin = dragOrigin.current;
      if (!origin || e.pointerId !== origin.pointerId) return;
      const dx = e.clientX - origin.startX;
      const dy = e.clientY - origin.startY;
      if (origin.kind === "move") {
        updateWindowGeometry(win.id, { x: origin.x + dx, y: origin.y + dy });
      } else {
        updateWindowGeometry(win.id, {
          width: origin.width + dx,
          height: origin.height + dy,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (dragOrigin.current && e.pointerId === dragOrigin.current.pointerId) {
        dragOrigin.current = null;
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [win.id, updateWindowGeometry]);

  const startDrag = (kind: "move" | "resize", e: React.PointerEvent) => {
    if (e.button !== 0) return;
    focusWindow(win.id);
    dragOrigin.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
    };
  };

  const accent = APP_REGISTRY[win.appId]?.accent ?? "#6366f1";

  return (
    <section
      aria-label={`${win.title} window`}
      onPointerDown={() => focusWindow(win.id)}
      style={{
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.z,
      }}
      className="smriti-glass-adaptive animate-smriti-scale pointer-events-auto fixed flex flex-col overflow-hidden rounded-2xl"
    >
      <header
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          startDrag("move", e);
        }}
        className="flex cursor-grab select-none items-center gap-2.5 border-b border-slate-900/10 px-3.5 py-2.5 active:cursor-grabbing dark:border-white/10"
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white"
          style={{ backgroundColor: accent }}
        >
          <AppIcon appId={win.appId} className="h-3.5 w-3.5" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {win.title}
        </h2>
        <button
          type="button"
          onClick={() => toggleMinimizeWindow(win.id)}
          aria-label={`Minimize ${win.title}`}
          title="Minimize"
          className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => closeWindow(win.id)}
          aria-label={`Close ${win.title}`}
          title="Close"
          className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-500 dark:text-slate-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">{renderAppBody(win.appId)}</div>

      {/* Bottom-right resize grip */}
      <div
        role="presentation"
        onPointerDown={(e) => startDrag("resize", e)}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize"
      >
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2 w-2 rounded-br-sm border-b-2 border-r-2 border-slate-400/60" />
      </div>
    </section>
  );
}

export function WindowManager() {
  const { windows, activeOverlay } = useSmriti();
  const visibleWindows = windows.filter((w) => !w.minimized);

  if (visibleWindows.length === 0) return null;

  return (
    <div
      aria-label="Application windows"
      aria-hidden={activeOverlay !== null}
      className={`isolate pointer-events-none fixed inset-0 z-[110] transition-opacity duration-200 ${
        activeOverlay ? "invisible opacity-0" : "visible opacity-100"
      }`}
    >
      {visibleWindows.map((win) => (
        <FloatingWindow key={win.id} win={win} />
      ))}
    </div>
  );
}
