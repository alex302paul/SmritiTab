import { useEffect } from "react";
import { WallpaperCanvas } from "./components/WallpaperCanvas";
import { BottomDockEdge } from "./components/edges/BottomDockEdge";
import { LeftQuickLinksEdge } from "./components/edges/LeftQuickLinksEdge";
import { RightControlsEdge } from "./components/edges/RightControlsEdge";
import { TopSearchEdge } from "./components/edges/TopSearchEdge";
import { FocusOverlay } from "./components/overlays/FocusOverlay";
import { LaunchpadOverlay } from "./components/overlays/LaunchpadOverlay";
import { ProfileOverlay } from "./components/overlays/ProfileOverlay";
import { QuickLinksOverlay } from "./components/overlays/QuickLinksOverlay";
import { SettingsOverlay } from "./components/overlays/SettingsOverlay";
import { WindowManager } from "./components/windows/WindowManager";
import { SmritiProvider, useSmriti } from "./context/SmritiContext";

function SmritiDashboardShell() {
  const { activeOverlay, openOverlay, closeOverlay } = useSmriti();

  // Global keyboard shortcuts (Escape closes active overlay; F toggles focus mode; Q/M/, for accessibility)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeOverlay !== null) {
          e.preventDefault();
          closeOverlay();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (inEditable || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        if (activeOverlay === "focus") closeOverlay();
        else openOverlay("focus");
      } else if (activeOverlay === null && key === "q") {
        e.preventDefault();
        openOverlay("quicklinks");
      } else if (activeOverlay === null && key === "m") {
        e.preventDefault();
        openOverlay("launchpad");
      } else if (activeOverlay === null && e.key === ",") {
        e.preventDefault();
        openOverlay("settings");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeOverlay, openOverlay, closeOverlay]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* Default screen: pure full-bleed wallpaper */}
      <WallpaperCanvas />

      {/* Draggable & resizable floating windows for Dock apps */}
      <WindowManager />

      {/* Four edge-triggered hover/tap controls (hidden while any major overlay is active) */}
      <TopSearchEdge />
      <LeftQuickLinksEdge />
      <RightControlsEdge />
      <BottomDockEdge />

      {/* Single active major overlay (strictly one at a time) */}
      {activeOverlay === "quicklinks" && <QuickLinksOverlay />}
      {activeOverlay === "launchpad" && <LaunchpadOverlay />}
      {activeOverlay === "settings" && <SettingsOverlay />}
      {activeOverlay === "profile" && <ProfileOverlay />}
      {activeOverlay === "focus" && <FocusOverlay />}
    </div>
  );
}

export function App() {
  return (
    <SmritiProvider>
      <SmritiDashboardShell />
    </SmritiProvider>
  );
}

export default App;
