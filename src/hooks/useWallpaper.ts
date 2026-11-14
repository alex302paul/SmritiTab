import { useCallback, useEffect, useRef, useState } from "react";
import { WALLPAPERS } from "../data/defaults";
import { LAST_WALLPAPER_KEY } from "../services/storage";
import type { WallpaperEntry, WallpaperMode } from "../types/smrititab";

interface WallpaperLayer {
  key: number;
  url: string;
}

let inMemoryLastId: string | null = null;

function readLastWallpaperId(): string | null {
  try {
    return window.localStorage.getItem(LAST_WALLPAPER_KEY) ?? inMemoryLastId;
  } catch {
    return inMemoryLastId;
  }
}

function saveLastWallpaperId(id: string) {
  inMemoryLastId = id;
  try {
    window.localStorage.setItem(LAST_WALLPAPER_KEY, id);
  } catch {
    // ignore
  }
}

function getFallbackWallpaper(): WallpaperEntry {
  return WALLPAPERS[0];
}

function pickRandomWallpaper(excludeId: string | null): WallpaperEntry {
  if (WALLPAPERS.length === 0) return getFallbackWallpaper();
  const pool =
    WALLPAPERS.length > 1 && excludeId
      ? WALLPAPERS.filter((w) => w.id !== excludeId)
      : WALLPAPERS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? getFallbackWallpaper();
}

function preloadImage(url: string, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Empty wallpaper URL"));
      return;
    }
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Wallpaper load timed out: ${url}`));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Could not load wallpaper: ${url}`));
    };
    img.src = url;
  });
}

export function useWallpaper(options: {
  mode: WallpaperMode;
  fixedId: string;
  customUrl?: string;
}) {
  const { mode, fixedId, customUrl } = options;
  const [layers, setLayers] = useState<WallpaperLayer[]>([]);
  const [activeKey, setActiveKey] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<WallpaperEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [shuffleNonce, setShuffleNonce] = useState(0);

  const counterRef = useRef(0);
  const initialRandomRef = useRef<WallpaperEntry | null>(null);
  const rafsRef = useRef<number[]>([]);

  const shuffleNow = useCallback(() => {
    initialRandomRef.current = pickRandomWallpaper(currentEntry?.id ?? readLastWallpaperId());
    setShuffleNonce((n) => n + 1);
  }, [currentEntry?.id]);

  useEffect(() => {
    let cancelled = false;

    const resolveTarget = (): WallpaperEntry => {
      if (mode === "fixed") {
        if (fixedId === "custom" && customUrl && /^https?:\/\//i.test(customUrl.trim())) {
          return {
            id: "custom",
            title: "Custom Wallpaper",
            src: customUrl.trim(),
            source: "custom",
          };
        }
        return WALLPAPERS.find((w) => w.id === fixedId) ?? getFallbackWallpaper();
      }
      if (!initialRandomRef.current) {
        initialRandomRef.current = pickRandomWallpaper(readLastWallpaperId());
      }
      return initialRandomRef.current;
    };

    const target = resolveTarget();
    setCurrentEntry(target);
    setLoading(true);

    const loadEntry = async (entry: WallpaperEntry, isFallback: boolean) => {
      try {
        await preloadImage(entry.src);
      } catch (err) {
        if (cancelled) return;
        console.warn("[SmritiTab] Wallpaper load failed; trying fallback.", err);
        if (isFallback) {
          setFailed(true);
          setLoading(false);
        } else {
          await loadEntry(getFallbackWallpaper(), true);
        }
        return;
      }

      if (cancelled) return;
      saveLastWallpaperId(entry.id);
      setFailed(false);
      setLoading(false);
      counterRef.current += 1;
      const nextKey = counterRef.current;

      setLayers((prev) => [...prev.slice(-1), { key: nextKey, url: entry.src }]);
      const raf = window.requestAnimationFrame(() => {
        if (!cancelled) setActiveKey(nextKey);
      });
      rafsRef.current.push(raf);
    };

    void loadEntry(target, target.id === getFallbackWallpaper().id);

    return () => {
      cancelled = true;
      for (const id of rafsRef.current) window.cancelAnimationFrame(id);
      rafsRef.current = [];
    };
  }, [mode, fixedId, customUrl, shuffleNonce]);

  return {
    layers,
    activeKey,
    currentEntry,
    loading,
    failed,
    shuffleNow,
  };
}
