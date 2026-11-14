import { DEFAULT_LOCAL_BOOKMARKS, SEARCH_PROVIDERS } from "../data/defaults";
import type {
  BookmarkNode,
  HistoryEntry,
  SavedLocation,
  SearchEngineId,
  SearchProvider,
  TemperatureUnit,
  WeatherSnapshot,
} from "../types/smrititab";
import { makeId, smritiStorage, STORAGE_KEYS } from "./storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeApi: any = typeof globalThis !== "undefined" ? (globalThis as any).chrome : undefined;

export function hasChromeBookmarks(): boolean {
  return Boolean(chromeApi?.bookmarks?.getTree);
}

export function hasChromeHistory(): boolean {
  return Boolean(chromeApi?.history?.search);
}

export function hasChromeTabs(): boolean {
  return Boolean(chromeApi?.tabs?.create);
}

export function hasChromeTabGroups(): boolean {
  return Boolean(chromeApi?.tabs?.create && chromeApi?.tabs?.group && chromeApi?.tabGroups?.update);
}

export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^localhost(:\d+)?(\/|$)/i.test(trimmed)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(trimmed);
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function extractDomain(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getFaviconUrl(urlOrDomain: string, size = 64): string {
  const domain = urlOrDomain.includes("://") || urlOrDomain.includes("/")
    ? extractDomain(urlOrDomain)
    : urlOrDomain;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function getSearchProvider(id: SearchEngineId): SearchProvider {
  return SEARCH_PROVIDERS.find((p) => p.id === id) ?? SEARCH_PROVIDERS[0];
}

export function buildSearchUrl(engineId: SearchEngineId, query: string): string {
  const trimmed = query.trim();
  if (isLikelyUrl(trimmed)) return normalizeUrl(trimmed);
  const provider = getSearchProvider(engineId);
  return provider.urlTemplate.replace("{q}", encodeURIComponent(trimmed));
}

export async function recordLocalVisit(url: string, title?: string): Promise<void> {
  if (!url || hasChromeHistory()) return;
  try {
    const existing = await smritiStorage.read<HistoryEntry[]>(STORAGE_KEYS.localHistory, []);
    const cleanUrl = normalizeUrl(url);
    const label = title?.trim() || extractDomain(cleanUrl);
    const found = existing.find((h) => h.url === cleanUrl);
    const next: HistoryEntry[] = [
      {
        id: found?.id ?? makeId("hist"),
        title: label,
        url: cleanUrl,
        lastVisitTime: Date.now(),
        visitCount: (found?.visitCount ?? 0) + 1,
      },
      ...existing.filter((h) => h.url !== cleanUrl),
    ].slice(0, 120);
    await smritiStorage.write(STORAGE_KEYS.localHistory, next);
  } catch {
    // non-fatal
  }
}

export async function openExternalUrl(
  url: string,
  openInNewTab: boolean,
  title?: string,
): Promise<void> {
  const clean = normalizeUrl(url);
  if (!clean) return;
  void recordLocalVisit(clean, title);

  if (openInNewTab) {
    if (hasChromeTabs()) {
      try {
        await chromeApi.tabs.create({ url: clean, active: true });
        return;
      } catch {
        // fallback to window.open
      }
    }
    window.open(clean, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = clean;
  }
}

// ─── Unified Bookmarks API (Chrome extension + localStorage fallback) ────────

export async function loadBookmarkTree(): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    const tree = await chromeApi.bookmarks.getTree();
    return Array.isArray(tree) ? tree : [];
  }
  const saved = await smritiStorage.read<BookmarkNode[] | null>(
    STORAGE_KEYS.localBookmarks,
    null,
  );
  if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  await smritiStorage.write(STORAGE_KEYS.localBookmarks, DEFAULT_LOCAL_BOOKMARKS);
  return DEFAULT_LOCAL_BOOKMARKS;
}

function cloneTree(nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.map((n) => ({
    ...n,
    children: n.children ? cloneTree(n.children) : undefined,
  }));
}

function findNode(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function removeFromTree(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].id === id) {
      const [removed] = nodes.splice(i, 1);
      return removed;
    }
    if (nodes[i].children) {
      const removed = removeFromTree(nodes[i].children!, id);
      if (removed) return removed;
    }
  }
  return null;
}

export async function createBookmarkNode(params: {
  parentId: string;
  title: string;
  url?: string;
}): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    await chromeApi.bookmarks.create({
      parentId: params.parentId,
      title: params.title,
      ...(params.url ? { url: normalizeUrl(params.url) } : {}),
    });
    return loadBookmarkTree();
  }
  const tree = cloneTree(await loadBookmarkTree());
  const parent = findNode(tree, params.parentId) ?? tree[0];
  if (parent) {
    if (!parent.children) parent.children = [];
    parent.children.push({
      id: makeId(params.url ? "bm" : "bmf"),
      parentId: parent.id,
      title: params.title,
      ...(params.url ? { url: normalizeUrl(params.url) } : { children: [] }),
    });
    await smritiStorage.write(STORAGE_KEYS.localBookmarks, tree);
  }
  return tree;
}

export async function updateBookmarkNode(
  id: string,
  changes: { title?: string; url?: string },
): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    await chromeApi.bookmarks.update(id, {
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.url !== undefined ? { url: normalizeUrl(changes.url) } : {}),
    });
    return loadBookmarkTree();
  }
  const tree = cloneTree(await loadBookmarkTree());
  const target = findNode(tree, id);
  if (target) {
    if (changes.title !== undefined) target.title = changes.title;
    if (changes.url !== undefined && target.url !== undefined) {
      target.url = normalizeUrl(changes.url);
    }
    await smritiStorage.write(STORAGE_KEYS.localBookmarks, tree);
  }
  return tree;
}

export async function deleteBookmarkNode(id: string, isFolder: boolean): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    if (isFolder) await chromeApi.bookmarks.removeTree(id);
    else await chromeApi.bookmarks.remove(id);
    return loadBookmarkTree();
  }
  const tree = cloneTree(await loadBookmarkTree());
  removeFromTree(tree, id);
  await smritiStorage.write(STORAGE_KEYS.localBookmarks, tree);
  return tree;
}

export async function moveBookmarkNode(
  id: string,
  parentId: string,
  index?: number,
): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    await chromeApi.bookmarks.move(id, {
      parentId,
      ...(index !== undefined ? { index } : {}),
    });
    return loadBookmarkTree();
  }
  const tree = cloneTree(await loadBookmarkTree());
  const node = removeFromTree(tree, id);
  const targetParent = findNode(tree, parentId);
  if (node && targetParent) {
    if (!targetParent.children) targetParent.children = [];
    node.parentId = parentId;
    if (index !== undefined) {
      targetParent.children.splice(index, 0, node);
    } else {
      targetParent.children.push(node);
    }
    await smritiStorage.write(STORAGE_KEYS.localBookmarks, tree);
  }
  return tree;
}

export async function searchAllBookmarks(query: string): Promise<Array<{ id: string; title: string; url: string }>> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (hasChromeBookmarks()) {
    try {
      const results = await chromeApi.bookmarks.search({ query: q });
      return (results ?? [])
        .filter((b: BookmarkNode) => Boolean(b.url))
        .map((b: BookmarkNode) => ({
          id: b.id,
          title: b.title || b.url || "",
          url: b.url!,
        }));
    } catch {
      return [];
    }
  }
  const tree = await loadBookmarkTree();
  const out: Array<{ id: string; title: string; url: string }> = [];
  const walk = (nodes: BookmarkNode[]) => {
    for (const node of nodes) {
      if (node.url) {
        if (`${node.title} ${node.url}`.toLowerCase().includes(q)) {
          out.push({ id: node.id, title: node.title || node.url, url: node.url });
        }
      }
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return out;
}

export async function openBookmarkFolderAsGroup(
  folder: BookmarkNode,
  openInNewTab: boolean,
): Promise<string> {
  const links: Array<{ title: string; url: string }> = [];
  const collect = (node: BookmarkNode) => {
    for (const child of node.children ?? []) {
      if (child.url) links.push({ title: child.title, url: normalizeUrl(child.url) });
      else if (child.children) collect(child);
    }
  };
  collect(folder);
  if (links.length === 0) return "This folder has no links to open.";

  if (hasChromeTabGroups()) {
    try {
      const tabIds: number[] = [];
      for (const link of links) {
        const tab = await chromeApi.tabs.create({ url: link.url, active: false });
        if (tab?.id) tabIds.push(tab.id);
      }
      if (tabIds.length === 0) return "No tabs could be opened.";
      const groupId = await chromeApi.tabs.group({ tabIds });
      await chromeApi.tabGroups.update(groupId, {
        title: folder.title || "Bookmarks",
        color: "orange",
        collapsed: false,
      });
      return `${tabIds.length} links opened in a Chrome tab group.`;
    } catch (err) {
      return err instanceof Error ? err.message : "Could not open folder as tab group.";
    }
  }

  for (const link of links.slice(0, 6)) {
    await openExternalUrl(link.url, openInNewTab, link.title);
  }
  return `Opened ${Math.min(links.length, 6)} link${links.length === 1 ? "" : "s"} from "${folder.title}".`;
}

// ─── Unified History API ─────────────────────────────────────────────────────

export async function searchHistoryItems(params: {
  text: string;
  maxResults?: number;
  startTime?: number;
}): Promise<HistoryEntry[]> {
  if (hasChromeHistory()) {
    try {
      const results = await chromeApi.history.search({
        text: params.text,
        maxResults: params.maxResults ?? 80,
        ...(params.startTime !== undefined ? { startTime: params.startTime } : {}),
      });
      return (results ?? [])
        .filter((item: HistoryEntry) => Boolean(item.url))
        .map((item: HistoryEntry) => ({
          id: String(item.id ?? item.url),
          title: item.title || item.url,
          url: item.url,
          lastVisitTime: item.lastVisitTime ?? Date.now(),
          visitCount: item.visitCount,
        }));
    } catch {
      return [];
    }
  }

  const local = await smritiStorage.read<HistoryEntry[]>(STORAGE_KEYS.localHistory, []);
  const q = params.text.trim().toLowerCase();
  return local
    .filter((entry) => {
      if (params.startTime && entry.lastVisitTime < params.startTime) return false;
      if (!q) return true;
      return `${entry.title} ${entry.url}`.toLowerCase().includes(q);
    })
    .slice(0, params.maxResults ?? 80);
}

// ─── Open-Meteo Weather API (Preserved from SmritiTab) ──────────────────────

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Weather service responded with ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function geocodeCity(name: string): Promise<SavedLocation | null> {
  const q = name.trim();
  if (!q) return null;
  const data = await fetchJsonWithTimeout<{
    results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
  }>(`${GEO_URL}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
  const first = data.results?.[0];
  if (!first) return null;
  return {
    name: first.name,
    country: first.country ?? "",
    latitude: first.latitude,
    longitude: first.longitude,
  };
}

export async function fetchWeatherForecast(loc: {
  city: string;
  latitude: number;
  longitude: number;
}): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    timezone: "auto",
  });
  const data = await fetchJsonWithTimeout<{
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      is_day?: number;
    };
  }>(`${WEATHER_URL}?${params.toString()}`);

  const cur = data.current;
  if (!cur || typeof cur.temperature_2m !== "number") {
    throw new Error("Weather service returned an unexpected payload");
  }

  return {
    city: loc.city,
    latitude: loc.latitude,
    longitude: loc.longitude,
    temperature: cur.temperature_2m,
    apparentTemperature: cur.apparent_temperature ?? cur.temperature_2m,
    humidity: cur.relative_humidity_2m ?? 0,
    windSpeed: cur.wind_speed_10m ?? 0,
    code: cur.weather_code ?? 0,
    isDay: cur.is_day !== 0,
    updatedAt: Date.now(),
  };
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Cloudy";
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const val = unit === "f" ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(val)}°${unit.toUpperCase()}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatClock(date: Date, opts: { hour24: boolean; seconds: boolean }): string {
  return date.toLocaleTimeString(undefined, {
    hour: opts.hour24 ? "2-digit" : "numeric",
    minute: "2-digit",
    ...(opts.seconds ? { second: "2-digit" } : {}),
    hour12: !opts.hour24,
  });
}

export function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
