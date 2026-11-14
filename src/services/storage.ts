import {
  DEFAULT_APPS,
  DEFAULT_CATEGORIES,
  DEFAULT_DOCK,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS,
  INTERNAL_APP_IDS,
} from "../data/defaults";
import type {
  AppLink,
  AppWindow,
  Category,
  ClipboardEntry,
  DockConfig,
  FavoriteItem,
  InternalAppId,
  NoteItem,
  Profile,
  SearchEngineId,
  Settings,
  StorageStatus,
  ThemeMode,
  TodoItem,
  TodoPriority,
  WallpaperPreset,
  WidgetsState,
} from "../types/smrititab";

export const NAMESPACE = "smrititab:v1";
export const SCHEMA_VERSION = 1;
export const LAST_WALLPAPER_KEY = "smrititab:last-wallpaper-id";

export const STORAGE_KEYS = {
  meta: `${NAMESPACE}:__meta`,
  settings: `${NAMESPACE}:settings`,
  profile: `${NAMESPACE}:profile`,
  categories: `${NAMESPACE}:categories`,
  apps: `${NAMESPACE}:apps`,
  favorites: `${NAMESPACE}:favorites`,
  notes: `${NAMESPACE}:notes`,
  todos: `${NAMESPACE}:todos`,
  widgets: `${NAMESPACE}:widgets`,
  dock: `${NAMESPACE}:dock`,
  windows: `${NAMESPACE}:windows`,
  clipboard: `${NAMESPACE}:clipboard`,
  quotes: `${NAMESPACE}:quotes`,
  weather: `${NAMESPACE}:weather`,
  location: `${NAMESPACE}:location`,
  pendingSearch: `${NAMESPACE}:pending-search`,
  pendingAction: `${NAMESPACE}:pending-action`,
  // Local fallbacks only used when chrome.bookmarks / chrome.history are unavailable
  localBookmarks: `${NAMESPACE}:local-bookmarks`,
  localHistory: `${NAMESPACE}:local-history`,
} as const;

interface StorageBackend {
  name: "chrome" | "local" | "memory";
  get: (keys: string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
}

const memoryStore = new Map<string, unknown>();

const memoryBackend: StorageBackend = {
  name: "memory",
  async get(keys) {
    const out: Record<string, unknown> = {};
    if (keys === null) {
      for (const [k, v] of memoryStore.entries()) out[k] = v;
      return out;
    }
    for (const k of keys) {
      if (memoryStore.has(k)) out[k] = memoryStore.get(k);
    }
    return out;
  },
  async set(items) {
    for (const [k, v] of Object.entries(items)) memoryStore.set(k, v);
  },
  async remove(keys) {
    for (const k of keys) memoryStore.delete(k);
  },
};

declare const chrome:
  | {
      storage?: {
        local?: {
          get: (keys: string[] | null) => Promise<Record<string, unknown>>;
          set: (items: Record<string, unknown>) => Promise<void>;
          remove: (keys: string[]) => Promise<void>;
        };
      };
    }
  | undefined;

const chromeBackend: StorageBackend = {
  name: "chrome",
  async get(keys) {
    return (await chrome!.storage!.local!.get(keys)) ?? {};
  },
  async set(items) {
    await chrome!.storage!.local!.set(items);
  },
  async remove(keys) {
    await chrome!.storage!.local!.remove(keys);
  },
};

const localBackend: StorageBackend = {
  name: "local",
  async get(keys) {
    const out: Record<string, unknown> = {};
    const keyList =
      keys === null
        ? Array.from({ length: window.localStorage.length }, (_, i) =>
            window.localStorage.key(i),
          ).filter((k): k is string => typeof k === "string")
        : keys;

    for (const k of keyList) {
      const raw = window.localStorage.getItem(k);
      if (raw !== null) {
        try {
          out[k] = JSON.parse(raw);
        } catch {
          // Leave corrupted key untouched if external, or ignore parse errors
        }
      }
    }
    return out;
  },
  async set(items) {
    for (const [k, v] of Object.entries(items)) {
      window.localStorage.setItem(k, JSON.stringify(v));
    }
  },
  async remove(keys) {
    for (const k of keys) window.localStorage.removeItem(k);
  },
};

function detectBackend(): StorageBackend {
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      return chromeBackend;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = `${NAMESPACE}:__probe__`;
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return localBackend;
    }
  } catch {
    // ignore
  }
  return memoryBackend;
}

function parseMaybeJson(val: unknown): unknown {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

class SmritiStorageService {
  private backend: StorageBackend;
  private status: StorageStatus;
  private writeQueues = new Map<string, Promise<void>>();

  constructor(backend: StorageBackend = detectBackend()) {
    this.backend = backend;
    this.status = { backend: backend.name, error: null };
  }

  refreshBackend() {
    this.backend = detectBackend();
    this.status = { backend: this.backend.name, error: this.status.error };
  }

  getStorageStatus(): StorageStatus {
    return { ...this.status };
  }

  private recordError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    this.status = { ...this.status, error: message };
  }

  private isContextInvalidated(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return /context invalidated|extension context/i.test(message);
  }

  async readAll(keys: string[]): Promise<Record<string, unknown>> {
    const fetchRaw = async () => {
      const raw = await this.backend.get(null);
      const parsed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        const val = parseMaybeJson(v);
        if (val !== undefined) parsed[k] = val;
      }
      return parsed;
    };

    let all: Record<string, unknown>;
    try {
      all = await fetchRaw();
    } catch (err) {
      this.recordError(err);
      if (this.isContextInvalidated(err)) {
        this.refreshBackend();
        try {
          all = await fetchRaw();
        } catch {
          all = {};
        }
      } else {
        all = {};
      }
    }

    const migrated = await this.applyMigrations(all);
    const subset: Record<string, unknown> = {};
    for (const k of keys) {
      if (migrated[k] !== undefined) subset[k] = migrated[k];
    }
    return subset;
  }

  private async applyMigrations(
    raw: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const meta = raw[STORAGE_KEYS.meta];
    const currentVersion =
      meta && typeof meta === "object" && "version" in meta
        ? Number((meta as { version?: unknown }).version)
        : 0;

    if (Number.isFinite(currentVersion) && currentVersion >= SCHEMA_VERSION) {
      return raw;
    }

    const next: Record<string, unknown> = { ...raw };
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("smrititab:") && !k.startsWith(NAMESPACE) && k !== LAST_WALLPAPER_KEY) {
        const migratedKey = `${NAMESPACE}:${k.slice(10)}`;
        if (next[migratedKey] === undefined) next[migratedKey] = v;
      }
    }

    try {
      const writes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(next)) {
        if (k.startsWith(NAMESPACE) && k !== STORAGE_KEYS.meta) writes[k] = v;
      }
      writes[STORAGE_KEYS.meta] = {
        version: SCHEMA_VERSION,
        migratedAt: Date.now(),
      };
      await this.backend.set(writes);
    } catch (err) {
      this.recordError(err);
    }

    return next;
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    const res = await this.readAll([key]);
    return res[key] === undefined ? fallback : (res[key] as T);
  }

  write(key: string, value: unknown): Promise<void> {
    const prev = this.writeQueues.get(key) ?? Promise.resolve();
    const task = prev
      .catch(() => {})
      .then(async () => {
        try {
          await this.backend.set({ [key]: value });
          if (this.status.error) {
            this.status = { ...this.status, error: null };
          }
        } catch (err) {
          this.recordError(err);
          if (this.isContextInvalidated(err)) {
            this.refreshBackend();
            try {
              await this.backend.set({ [key]: value });
            } catch {
              // ignore
            }
          }
        }
      });
    this.writeQueues.set(key, task);
    return task;
  }

  async remove(keys: string[]): Promise<void> {
    try {
      await this.backend.remove(keys);
    } catch (err) {
      this.recordError(err);
    }
  }
}

export const smritiStorage = new SmritiStorageService();

// ─── Sanitizers matching SmritiTab's original schema contracts ───────────────

const VALID_THEMES = new Set<ThemeMode>(["light", "dark", "system"]);
const VALID_WALLPAPERS = new Set<WallpaperPreset>(["aurora", "dune", "mesh", "mist", "solid"]);
const VALID_ENGINES = new Set<SearchEngineId>([
  "google",
  "duckduckgo",
  "bing",
  "youtube",
  "chatgpt",
  "perplexity",
]);
const VALID_PRIORITIES = new Set<TodoPriority>(["low", "medium", "high"]);
const INTERNAL_SET = new Set<string>(INTERNAL_APP_IDS);

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function sanitizeSettings(raw: unknown): Settings {
  if (!isObj(raw)) return { ...DEFAULT_SETTINGS };
  const theme = str(raw.theme) as ThemeMode;
  const wallpaper = str(raw.wallpaper) as WallpaperPreset;
  const searchEngine = str(raw.searchEngine) as SearchEngineId;

  return {
    theme: VALID_THEMES.has(theme) ? theme : DEFAULT_SETTINGS.theme,
    wallpaper: VALID_WALLPAPERS.has(wallpaper) ? wallpaper : DEFAULT_SETTINGS.wallpaper,
    wallpaperMode: raw.wallpaperMode === "fixed" ? "fixed" : "random",
    fixedWallpaperId: str(raw.fixedWallpaperId, DEFAULT_SETTINGS.fixedWallpaperId),
    customWallpaperUrl: str(raw.customWallpaperUrl, ""),
    accent: str(raw.accent, DEFAULT_SETTINGS.accent),
    searchEngine: VALID_ENGINES.has(searchEngine)
      ? searchEngine
      : DEFAULT_SETTINGS.searchEngine,
    openInNewTab: bool(raw.openInNewTab, DEFAULT_SETTINGS.openInNewTab),
    temperatureUnit: raw.temperatureUnit === "f" ? "f" : "c",
    clock24h: bool(raw.clock24h, DEFAULT_SETTINGS.clock24h),
    clockSeconds: bool(raw.clockSeconds, DEFAULT_SETTINGS.clockSeconds),
    showSecondsInClock: bool(raw.showSecondsInClock, DEFAULT_SETTINGS.showSecondsInClock),
    showGreeting: bool(raw.showGreeting, DEFAULT_SETTINGS.showGreeting),
    showClockWidget: bool(raw.showClockWidget, DEFAULT_SETTINGS.showClockWidget),
    showWeatherWidget: bool(raw.showWeatherWidget, DEFAULT_SETTINGS.showWeatherWidget),
    showQuoteWidget: bool(raw.showQuoteWidget, DEFAULT_SETTINGS.showQuoteWidget),
    sidebarCollapsed: bool(raw.sidebarCollapsed, DEFAULT_SETTINGS.sidebarCollapsed),
    railVisible: bool(raw.railVisible, DEFAULT_SETTINGS.railVisible),
    dockVisible: bool(raw.dockVisible, DEFAULT_SETTINGS.dockVisible),
    voiceLanguage: str(raw.voiceLanguage, DEFAULT_SETTINGS.voiceLanguage),
  };
}

export function sanitizeProfile(raw: unknown): Profile {
  if (!isObj(raw)) return { ...DEFAULT_PROFILE };
  return {
    name: str(raw.name, DEFAULT_PROFILE.name).slice(0, 60),
    tagline: str(raw.tagline, DEFAULT_PROFILE.tagline).slice(0, 160),
    email: str(raw.email, DEFAULT_PROFILE.email).slice(0, 120),
  };
}

export function sanitizeCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const seen = new Set<string>();
  const out: Category[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const name = str(item.name).trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: name.slice(0, 40),
      accent: str(item.accent, "#6366f1"),
    });
  }
  return out.length ? out : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

export function sanitizeApps(raw: unknown, categories: Category[]): AppLink[] {
  if (!Array.isArray(raw)) return DEFAULT_APPS.map((a) => ({ ...a }));
  const validCatIds = new Set(categories.map((c) => c.id));
  const fallbackCatId = categories[0]?.id ?? "cat_work";
  const seen = new Set<string>();
  const out: AppLink[] = [];

  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const name = str(item.name).trim();
    const target = str(item.target).trim();
    if (!id || !name || !target || seen.has(id)) continue;
    seen.add(id);
    const kind = item.kind === "internal" ? "internal" : "web";
    const catId = str(item.categoryId);
    out.push({
      id,
      name: name.slice(0, 40),
      target,
      kind,
      categoryId: validCatIds.has(catId) ? catId : fallbackCatId,
      iconText: str(item.iconText, name.slice(0, 2)).slice(0, 3),
    });
  }
  return out;
}

export function sanitizeFavorites(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FavoriteItem[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const url = str(item.url).trim();
    if (!id || !url || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      url,
      title: str(item.title).trim() || url,
      addedAt: num(item.addedAt, Date.now()),
    });
  }
  return out;
}

export function sanitizeNotes(raw: unknown): NoteItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: NoteItem[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: str(item.title, "Untitled").slice(0, 120),
      body: str(item.body),
      pinned: bool(item.pinned, false),
      updatedAt: num(item.updatedAt, Date.now()),
    });
  }
  return out;
}

export function sanitizeTodos(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: TodoItem[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const title = str(item.title).trim();
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    const p = str(item.priority, "medium") as TodoPriority;
    out.push({
      id,
      title: title.slice(0, 200),
      done: bool(item.done, false),
      priority: VALID_PRIORITIES.has(p) ? p : "medium",
      due: typeof item.due === "string" && item.due.trim() ? item.due : null,
      createdAt: num(item.createdAt, Date.now()),
    });
  }
  return out;
}

export function sanitizeWidgets(raw: unknown): WidgetsState {
  const src = isObj(raw) ? raw : {};
  const clamp = (v: unknown, def: { x: number; y: number; visible: boolean }) => {
    if (!isObj(v)) return { ...def };
    return {
      x: Math.min(Math.max(num(v.x, def.x), 0), 1),
      y: Math.min(Math.max(num(v.y, def.y), 0), 1),
      visible: bool(v.visible, def.visible),
    };
  };
  return {
    clock: clamp(src.clock, DEFAULT_WIDGETS.clock),
    weather: clamp(src.weather, DEFAULT_WIDGETS.weather),
    quote: clamp(src.quote, DEFAULT_WIDGETS.quote),
  };
}

export function sanitizeDock(raw: unknown, apps: AppLink[]): DockConfig {
  const src = isObj(raw) ? raw : {};
  const allowed = new Set<string>([...apps.map((a) => a.id), ...INTERNAL_APP_IDS]);
  const appIds: string[] = [];
  if (Array.isArray(src.appIds)) {
    for (const id of src.appIds) {
      const s = str(id);
      if (s && allowed.has(s) && !appIds.includes(s)) appIds.push(s);
    }
  }
  return {
    appIds: appIds.length ? appIds : [...DEFAULT_DOCK.appIds],
    size: src.size === "sm" || src.size === "lg" ? src.size : "md",
    position: src.position === "left" ? "left" : "bottom",
    labels: bool(src.labels, DEFAULT_DOCK.labels),
  };
}

export function sanitizeWindows(raw: unknown): AppWindow[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AppWindow[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const appId = str(item.appId);
    if (!id || !INTERNAL_SET.has(appId) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      appId: appId as InternalAppId,
      title: str(item.title, "Window").slice(0, 60),
      x: num(item.x, 120),
      y: num(item.y, 120),
      width: Math.max(300, num(item.width, 460)),
      height: Math.max(240, num(item.height, 420)),
      z: num(item.z, 100),
      minimized: bool(item.minimized, false),
    });
  }
  return out;
}

export function sanitizeClipboard(raw: unknown): ClipboardEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ClipboardEntry[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const id = str(item.id).trim();
    const text = str(item.text);
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      text: text.slice(0, 5000),
      createdAt: num(item.createdAt, Date.now()),
    });
  }
  return out.slice(0, 50);
}
