import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  APP_REGISTRY,
  DEFAULT_APPS,
  DEFAULT_CATEGORIES,
  DEFAULT_DOCK,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS,
} from "../data/defaults";
import { useWallpaper } from "../hooks/useWallpaper";
import {
  buildSearchUrl,
  fetchWeatherForecast,
  geocodeCity,
  openExternalUrl,
} from "../services/browserApi";
import {
  makeId,
  sanitizeApps,
  sanitizeCategories,
  sanitizeClipboard,
  sanitizeDock,
  sanitizeFavorites,
  sanitizeNotes,
  sanitizeProfile,
  sanitizeSettings,
  sanitizeTodos,
  sanitizeWidgets,
  sanitizeWindows,
  smritiStorage,
  STORAGE_KEYS,
} from "../services/storage";
import type {
  AppLink,
  AppWindow,
  Category,
  ClipboardEntry,
  DockConfig,
  FavoriteItem,
  InternalAppId,
  NoteItem,
  OverlayId,
  Profile,
  SavedLocation,
  Settings,
  StorageStatus,
  TodoItem,
  TodoPriority,
  WallpaperEntry,
  WeatherSnapshot,
  WidgetsState,
} from "../types/smrititab";

interface PersistedDashboardState {
  settings: Settings;
  profile: Profile;
  categories: Category[];
  apps: AppLink[];
  favorites: FavoriteItem[];
  notes: NoteItem[];
  todos: TodoItem[];
  widgets: WidgetsState;
  dock: DockConfig;
  clipboard: ClipboardEntry[];
}

const INITIAL_STATE: PersistedDashboardState = {
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  categories: DEFAULT_CATEGORIES,
  apps: DEFAULT_APPS,
  favorites: [],
  notes: [],
  todos: [],
  widgets: DEFAULT_WIDGETS,
  dock: DEFAULT_DOCK,
  clipboard: [],
};

interface WeatherState {
  snapshot: WeatherSnapshot | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  stale: boolean;
  location: SavedLocation | null;
  refresh: () => Promise<void>;
  setCity: (city: string) => Promise<boolean>;
}

interface SmritiContextValue extends PersistedDashboardState {
  ready: boolean;
  storageStatus: StorageStatus;

  // Settings & profile
  updateSettings: (patch: Partial<Settings>) => void;
  updateProfile: (patch: Partial<Profile>) => void;

  // Quick Links categories & apps (preserving cat_work, cat_daily IDs & CRUD)
  createCategory: (input: { name: string; accent?: string }) => Category;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  createApp: (input: {
    name: string;
    target: string;
    kind: "web" | "internal";
    categoryId: string;
    iconText?: string;
  }) => AppLink;
  updateApp: (id: string, patch: Partial<Omit<AppLink, "id">>) => void;
  deleteApp: (id: string) => void;

  // Favorites
  toggleFavorite: (url: string, title?: string) => void;
  isFavorite: (url: string) => boolean;

  // Notes
  addNote: (input?: { title?: string; body?: string }) => NoteItem;
  updateNote: (id: string, patch: Partial<Omit<NoteItem, "id">>) => void;
  deleteNote: (id: string) => void;

  // Todos
  addTodo: (input: { title: string; priority?: TodoPriority; due?: string | null }) => TodoItem;
  updateTodo: (id: string, patch: Partial<Omit<TodoItem, "id">>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  // Clipboard
  addClipboardEntry: (text: string) => void;
  removeClipboardEntry: (id: string) => void;
  clearClipboardEntries: () => void;

  // Widgets & Dock
  updateDock: (patch: Partial<DockConfig>) => void;
  resetDashboard: () => Promise<void>;

  // Navigation
  openUrl: (url: string, title?: string) => void;
  openApp: (app: AppLink) => void;
  openInternalApp: (appId: InternalAppId) => void;

  // Floating app windows
  windows: AppWindow[];
  openWindow: (appId: InternalAppId, title?: string) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimizeWindow: (id: string) => void;
  updateWindowGeometry: (
    id: string,
    patch: Partial<Pick<AppWindow, "x" | "y" | "width" | "height">>,
  ) => void;
  hasOpenWindow: (appId: InternalAppId) => boolean;

  // Single-overlay manager
  activeOverlay: OverlayId;
  openOverlay: (overlay: Exclude<OverlayId, null>) => void;
  closeOverlay: () => void;

  // Wallpaper controller
  wallpaper: {
    layers: Array<{ key: number; url: string }>;
    activeKey: number;
    currentEntry: WallpaperEntry | null;
    loading: boolean;
    failed: boolean;
    shuffleNow: () => void;
  };

  // Weather controller
  weather: WeatherState;

  // Search focus signal
  searchFocusSignal: number;
  requestSearchFocus: () => void;
}

const SmritiContext = createContext<SmritiContextValue | null>(null);

const MIN_W = 320;
const MIN_H = 260;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function getViewport() {
  if (typeof window === "undefined") return { width: 1440, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function SmritiProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedDashboardState>(INITIAL_STATE);
  const [ready, setReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(() =>
    smritiStorage.getStorageStatus(),
  );
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>(null);
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);

  // Floating windows state
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [windowsReady, setWindowsReady] = useState(false);
  const zCounterRef = useRef(120);
  const cascadeRef = useRef(0);

  // Weather state (lazy — does not prompt geolocation until Weather app is used)
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherStale, setWeatherStale] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<SavedLocation | null>(null);
  const locRef = useRef<SavedLocation | null>(null);

  // 1. Hydrate all smrititab:v1 keys on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const keys = [
        STORAGE_KEYS.settings,
        STORAGE_KEYS.profile,
        STORAGE_KEYS.categories,
        STORAGE_KEYS.apps,
        STORAGE_KEYS.favorites,
        STORAGE_KEYS.notes,
        STORAGE_KEYS.todos,
        STORAGE_KEYS.widgets,
        STORAGE_KEYS.dock,
        STORAGE_KEYS.clipboard,
        STORAGE_KEYS.windows,
      ];
      const loaded = await smritiStorage.readAll(keys);
      if (cancelled) return;

      const categories = sanitizeCategories(loaded[STORAGE_KEYS.categories]);
      const apps = sanitizeApps(loaded[STORAGE_KEYS.apps], categories);
      const dock = sanitizeDock(loaded[STORAGE_KEYS.dock], apps);

      setState({
        settings: sanitizeSettings(loaded[STORAGE_KEYS.settings]),
        profile: sanitizeProfile(loaded[STORAGE_KEYS.profile]),
        categories,
        apps,
        favorites: sanitizeFavorites(loaded[STORAGE_KEYS.favorites]),
        notes: sanitizeNotes(loaded[STORAGE_KEYS.notes]),
        todos: sanitizeTodos(loaded[STORAGE_KEYS.todos]),
        widgets: sanitizeWidgets(loaded[STORAGE_KEYS.widgets]),
        dock,
        clipboard: sanitizeClipboard(loaded[STORAGE_KEYS.clipboard]),
      });

      const savedWins = sanitizeWindows(loaded[STORAGE_KEYS.windows]).map((w) => ({
        ...w,
        minimized: true, // Wallpaper-first default: keep windows tucked away until opened from dock!
      }));
      setWindows(savedWins);
      zCounterRef.current = savedWins.reduce((m, w) => Math.max(m, w.z), 120);
      setWindowsReady(true);

      setReady(true);
      setStorageStatus(smritiStorage.getStorageStatus());
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Persist state slices to smrititab:v1
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.settings, state.settings);
  }, [ready, state.settings]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.profile, state.profile);
  }, [ready, state.profile]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.categories, state.categories);
  }, [ready, state.categories]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.apps, state.apps);
  }, [ready, state.apps]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.favorites, state.favorites);
  }, [ready, state.favorites]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.notes, state.notes);
  }, [ready, state.notes]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.todos, state.todos);
  }, [ready, state.todos]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.widgets, state.widgets);
  }, [ready, state.widgets]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.dock, state.dock);
  }, [ready, state.dock]);
  useEffect(() => {
    if (ready) void smritiStorage.write(STORAGE_KEYS.clipboard, state.clipboard);
  }, [ready, state.clipboard]);
  useEffect(() => {
    if (windowsReady) void smritiStorage.write(STORAGE_KEYS.windows, windows);
  }, [windowsReady, windows]);

  // 3. Apply light/dark/system theme to document root
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const dark =
        state.settings.theme === "dark" ||
        (state.settings.theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [state.settings.theme]);

  // 4. Wallpaper hook
  const wallpaper = useWallpaper({
    mode: state.settings.wallpaperMode,
    fixedId: state.settings.fixedWallpaperId,
    customUrl: state.settings.customWallpaperUrl,
  });

  // 5. Overlay management — strictly single active major overlay
  const openOverlay = useCallback((overlay: Exclude<OverlayId, null>) => {
    setActiveOverlay(overlay);
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  const requestSearchFocus = useCallback(() => {
    setActiveOverlay(null);
    setSearchFocusSignal((n) => n + 1);
  }, []);

  // 6. Pending service-worker actions (selection search / open-search / toggle-focus)
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const [pendingSearch, pendingAction] = await Promise.all([
        smritiStorage.read<string | null>(STORAGE_KEYS.pendingSearch, null),
        smritiStorage.read<string | null>(STORAGE_KEYS.pendingAction, null),
      ]);
      if (cancelled) return;
      const toRemove: string[] = [];
      if (typeof pendingSearch === "string" && pendingSearch.trim()) {
        toRemove.push(STORAGE_KEYS.pendingSearch);
      }
      if (typeof pendingAction === "string" && pendingAction) {
        toRemove.push(STORAGE_KEYS.pendingAction);
      }
      if (toRemove.length > 0) await smritiStorage.remove(toRemove);
      if (cancelled) return;

      if (typeof pendingSearch === "string" && pendingSearch.trim()) {
        const url = buildSearchUrl(state.settings.searchEngine, pendingSearch);
        void openExternalUrl(url, state.settings.openInNewTab, pendingSearch);
        return;
      }
      if (pendingAction === "toggle-focus") {
        setActiveOverlay("focus");
      } else if (pendingAction === "focus-search") {
        requestSearchFocus();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, state.settings.searchEngine, state.settings.openInNewTab, requestSearchFocus]);

  // 7. CRUD mutators
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: sanitizeSettings({ ...prev.settings, ...patch }) }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((prev) => ({ ...prev, profile: sanitizeProfile({ ...prev.profile, ...patch }) }));
  }, []);

  const createCategory = useCallback((input: { name: string; accent?: string }) => {
    const cat: Category = {
      id: makeId("cat"),
      name: input.name.trim() || "Untitled",
      accent: input.accent ?? "#6366f1",
    };
    setState((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
    return cat;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Omit<Category, "id">>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.categories.filter((c) => c.id !== id);
      if (remaining.length === 0) return prev;
      const fallbackId = remaining[0].id;
      return {
        ...prev,
        categories: remaining,
        apps: prev.apps.map((a) => (a.categoryId === id ? { ...a, categoryId: fallbackId } : a)),
      };
    });
  }, []);

  const createApp = useCallback(
    (input: {
      name: string;
      target: string;
      kind: "web" | "internal";
      categoryId: string;
      iconText?: string;
    }) => {
      const name = input.name.trim() || "Untitled";
      const app: AppLink = {
        id: makeId("app"),
        name: name.slice(0, 40),
        target: input.target.trim(),
        kind: input.kind,
        categoryId: input.categoryId,
        iconText: (input.iconText?.trim() || name.slice(0, 2) || "?").slice(0, 3),
      };
      setState((prev) => ({ ...prev, apps: [...prev.apps, app] }));
      return app;
    },
    [],
  );

  const updateApp = useCallback((id: string, patch: Partial<Omit<AppLink, "id">>) => {
    setState((prev) => ({
      ...prev,
      apps: prev.apps.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const deleteApp = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      apps: prev.apps.filter((a) => a.id !== id),
      dock: { ...prev.dock, appIds: prev.dock.appIds.filter((d) => d !== id) },
    }));
  }, []);

  const toggleFavorite = useCallback((url: string, title?: string) => {
    setState((prev) => {
      const existing = prev.favorites.find((f) => f.url === url);
      if (existing) {
        return { ...prev, favorites: prev.favorites.filter((f) => f.id !== existing.id) };
      }
      return {
        ...prev,
        favorites: [
          {
            id: makeId("fav"),
            url,
            title: title?.trim() || url,
            addedAt: Date.now(),
          },
          ...prev.favorites,
        ],
      };
    });
  }, []);

  const isFavorite = useCallback(
    (url: string) => state.favorites.some((f) => f.url === url),
    [state.favorites],
  );

  const addNote = useCallback((input?: { title?: string; body?: string }) => {
    const note: NoteItem = {
      id: makeId("note"),
      title: input?.title?.trim() || "Untitled note",
      body: input?.body ?? "",
      pinned: false,
      updatedAt: Date.now(),
    };
    setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Omit<NoteItem, "id">>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
  }, []);

  const addTodo = useCallback(
    (input: { title: string; priority?: TodoPriority; due?: string | null }) => {
      const item: TodoItem = {
        id: makeId("todo"),
        title: input.title.trim(),
        done: false,
        priority: input.priority ?? "medium",
        due: input.due ?? null,
        createdAt: Date.now(),
      };
      setState((prev) => ({ ...prev, todos: [item, ...prev.todos] }));
      return item;
    },
    [],
  );

  const updateTodo = useCallback((id: string, patch: Partial<Omit<TodoItem, "id">>) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setState((prev) => ({ ...prev, todos: prev.todos.filter((t) => t.id !== id) }));
  }, []);

  const addClipboardEntry = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((prev) => {
      const deduped = prev.clipboard.filter((c) => c.text !== trimmed);
      return {
        ...prev,
        clipboard: [{ id: makeId("clip"), text: trimmed, createdAt: Date.now() }, ...deduped].slice(
          0,
          50,
        ),
      };
    });
  }, []);

  const removeClipboardEntry = useCallback((id: string) => {
    setState((prev) => ({ ...prev, clipboard: prev.clipboard.filter((c) => c.id !== id) }));
  }, []);

  const clearClipboardEntries = useCallback(() => {
    setState((prev) => ({ ...prev, clipboard: [] }));
  }, []);

  const updateDock = useCallback((patch: Partial<DockConfig>) => {
    setState((prev) => ({ ...prev, dock: { ...prev.dock, ...patch } }));
  }, []);

  const resetDashboard = useCallback(async () => {
    await smritiStorage.remove([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.profile,
      STORAGE_KEYS.categories,
      STORAGE_KEYS.apps,
      STORAGE_KEYS.favorites,
      STORAGE_KEYS.notes,
      STORAGE_KEYS.todos,
      STORAGE_KEYS.widgets,
      STORAGE_KEYS.dock,
      STORAGE_KEYS.windows,
      STORAGE_KEYS.clipboard,
    ]);
    setState(INITIAL_STATE);
    setWindows([]);
    setStorageStatus(smritiStorage.getStorageStatus());
  }, []);

  // 8. Floating window controls
  const openWindow = useCallback((appId: InternalAppId, customTitle?: string) => {
    const title = customTitle ?? APP_REGISTRY[appId]?.title ?? "App";
    const { width: vw, height: vh } = getViewport();
    const isWide = appId === "bookmarks" || appId === "notes";
    const w = isWide
      ? Math.min(920, Math.max(360, vw - 48))
      : Math.min(480, Math.max(MIN_W, vw - 48));
    const h = isWide
      ? Math.min(620, Math.max(380, vh - 110))
      : Math.min(540, Math.max(MIN_H, vh - 120));
    const step = (cascadeRef.current % 5) * 26;
    cascadeRef.current += 1;

    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    const newId = makeId("win");

    setWindows((prev) => {
      const existing = prev.find((win) => win.appId === appId);
      if (existing) {
        return prev.map((win) =>
          win.id === existing.id ? { ...win, minimized: false, z: nextZ } : win,
        );
      }
      const nextWin: AppWindow = {
        id: newId,
        appId,
        title,
        x: clamp(Math.round((vw - w) / 2) + step - 40, 12, Math.max(12, vw - w - 12)),
        y: clamp(Math.round((vh - h) / 2) + step - 32, 16, Math.max(16, vh - h - 24)),
        width: w,
        height: h,
        z: nextZ,
        minimized: false,
      };
      return [...prev, nextWin];
    });
    return newId;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target || target.z === zCounterRef.current) return prev;
      zCounterRef.current += 1;
      const nextZ = zCounterRef.current;
      return prev.map((w) => (w.id === id ? { ...w, z: nextZ } : w));
    });
  }, []);

  const toggleMinimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.minimized) {
          zCounterRef.current += 1;
          return { ...w, minimized: false, z: zCounterRef.current };
        }
        return { ...w, minimized: true };
      }),
    );
  }, []);

  const updateWindowGeometry = useCallback(
    (id: string, patch: Partial<Pick<AppWindow, "x" | "y" | "width" | "height">>) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          const { width: vw, height: vh } = getViewport();
          const width = clamp(patch.width ?? w.width, MIN_W, Math.max(MIN_W, vw - 16));
          const height = clamp(patch.height ?? w.height, MIN_H, Math.max(MIN_H, vh - 16));
          const x = clamp(patch.x ?? w.x, 0, Math.max(0, vw - width));
          const y = clamp(patch.y ?? w.y, 0, Math.max(0, vh - 48));
          return { ...w, x, y, width, height };
        }),
      );
    },
    [],
  );

  const hasOpenWindow = useCallback(
    (appId: InternalAppId) => windows.some((w) => w.appId === appId && !w.minimized),
    [windows],
  );

  // 9. Navigation
  const openUrl = useCallback(
    (url: string, title?: string) => {
      void openExternalUrl(url, state.settings.openInNewTab, title);
    },
    [state.settings.openInNewTab],
  );

  const openInternalApp = useCallback(
    (appId: InternalAppId) => {
      if (appId === "settings") {
        openOverlay("settings");
        return;
      }
      if (appId === "profile") {
        openOverlay("profile");
        return;
      }
      openWindow(appId);
    },
    [openOverlay, openWindow],
  );

  const openApp = useCallback(
    (app: AppLink) => {
      if (app.kind === "internal") {
        openInternalApp(app.target as InternalAppId);
      } else {
        openUrl(app.target, app.name);
      }
    },
    [openInternalApp, openUrl],
  );

  // 10. Weather Controller (lazy — only invoked by WeatherApp)
  const refreshWeather = useCallback(async () => {
    setWeatherStatus("loading");
    setWeatherError(null);
    try {
      let loc = locRef.current;
      if (!loc) {
        const stored = await smritiStorage.read<SavedLocation | null>(STORAGE_KEYS.location, null);
        if (stored && typeof stored.latitude === "number" && typeof stored.longitude === "number") {
          loc = stored;
          locRef.current = stored;
          setWeatherLocation(stored);
        }
      }
      if (!loc) {
        loc = await new Promise<SavedLocation | null>((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            ({ coords }) =>
              resolve({
                name: "Your location",
                country: "",
                latitude: coords.latitude,
                longitude: coords.longitude,
              }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
          );
        });
        if (!loc) {
          throw new Error("Allow location access or choose a city below to load local weather.");
        }
        locRef.current = loc;
        setWeatherLocation(loc);
      }

      const snap = await fetchWeatherForecast({
        city: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setWeatherSnapshot(snap);
      setWeatherStale(false);
      setWeatherStatus("ready");
      await smritiStorage.write(STORAGE_KEYS.weather, snap);
    } catch (err) {
      const cached = await smritiStorage.read<WeatherSnapshot | null>(STORAGE_KEYS.weather, null);
      const msg = err instanceof Error ? err.message : "Weather is unavailable right now.";
      if (cached && typeof cached.temperature === "number") {
        setWeatherSnapshot(cached);
        setWeatherStale(true);
        setWeatherStatus("ready");
        setWeatherError(`Showing last cached reading — ${msg}`);
      } else {
        setWeatherStatus("error");
        setWeatherError(msg);
      }
    }
  }, []);

  const setWeatherCity = useCallback(
    async (city: string) => {
      const trimmed = city.trim();
      if (!trimmed) return false;
      setWeatherError(null);
      try {
        const geo = await geocodeCity(trimmed);
        if (!geo) {
          setWeatherError(`No place called "${trimmed}" was found.`);
          return false;
        }
        const saved: SavedLocation = { ...geo, updatedAt: Date.now() };
        locRef.current = saved;
        setWeatherLocation(saved);
        await smritiStorage.write(STORAGE_KEYS.location, saved);
        await refreshWeather();
        return true;
      } catch (err) {
        setWeatherError(err instanceof Error ? err.message : "Could not look up that city.");
        return false;
      }
    },
    [refreshWeather],
  );

  const weather = useMemo<WeatherState>(
    () => ({
      snapshot: weatherSnapshot,
      status: weatherStatus,
      error: weatherError,
      stale: weatherStale,
      location: weatherLocation,
      refresh: refreshWeather,
      setCity: setWeatherCity,
    }),
    [
      weatherSnapshot,
      weatherStatus,
      weatherError,
      weatherStale,
      weatherLocation,
      refreshWeather,
      setWeatherCity,
    ],
  );

  const value = useMemo<SmritiContextValue>(
    () => ({
      ...state,
      ready,
      storageStatus,
      updateSettings,
      updateProfile,
      createCategory,
      updateCategory,
      deleteCategory,
      createApp,
      updateApp,
      deleteApp,
      toggleFavorite,
      isFavorite,
      addNote,
      updateNote,
      deleteNote,
      addTodo,
      updateTodo,
      toggleTodo,
      deleteTodo,
      addClipboardEntry,
      removeClipboardEntry,
      clearClipboardEntries,
      updateDock,
      resetDashboard,
      openUrl,
      openApp,
      openInternalApp,
      windows,
      openWindow,
      closeWindow,
      focusWindow,
      toggleMinimizeWindow,
      updateWindowGeometry,
      hasOpenWindow,
      activeOverlay,
      openOverlay,
      closeOverlay,
      wallpaper,
      weather,
      searchFocusSignal,
      requestSearchFocus,
    }),
    [
      state,
      ready,
      storageStatus,
      updateSettings,
      updateProfile,
      createCategory,
      updateCategory,
      deleteCategory,
      createApp,
      updateApp,
      deleteApp,
      toggleFavorite,
      isFavorite,
      addNote,
      updateNote,
      deleteNote,
      addTodo,
      updateTodo,
      toggleTodo,
      deleteTodo,
      addClipboardEntry,
      removeClipboardEntry,
      clearClipboardEntries,
      updateDock,
      resetDashboard,
      openUrl,
      openApp,
      openInternalApp,
      windows,
      openWindow,
      closeWindow,
      focusWindow,
      toggleMinimizeWindow,
      updateWindowGeometry,
      hasOpenWindow,
      activeOverlay,
      openOverlay,
      closeOverlay,
      wallpaper,
      weather,
      searchFocusSignal,
      requestSearchFocus,
    ],
  );

  return <SmritiContext.Provider value={value}>{children}</SmritiContext.Provider>;
}

export function useSmriti() {
  const ctx = useContext(SmritiContext);
  if (!ctx) throw new Error("useSmriti must be used inside <SmritiProvider>");
  return ctx;
}
