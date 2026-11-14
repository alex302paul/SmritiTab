export type ThemeMode = "light" | "dark" | "system";
export type WallpaperPreset = "aurora" | "dune" | "mesh" | "mist" | "solid";
export type WallpaperMode = "random" | "fixed";
export type SearchEngineId = "google" | "duckduckgo" | "bing" | "youtube" | "chatgpt" | "perplexity";
export type TemperatureUnit = "c" | "f";
export type TodoPriority = "low" | "medium" | "high";
export type DockSize = "sm" | "md" | "lg";
export type DockPosition = "bottom" | "left";

export type InternalAppId =
  | "notes"
  | "todo"
  | "calculator"
  | "bookmarks"
  | "history"
  | "clipboard"
  | "favorites"
  | "weather"
  | "settings"
  | "profile";

export type OverlayId = null | "quicklinks" | "launchpad" | "settings" | "profile" | "focus";

export interface Settings {
  theme: ThemeMode;
  wallpaper: WallpaperPreset;
  wallpaperMode: WallpaperMode;
  fixedWallpaperId: string;
  customWallpaperUrl?: string;
  accent: string;
  searchEngine: SearchEngineId;
  openInNewTab: boolean;
  temperatureUnit: TemperatureUnit;
  clock24h: boolean;
  clockSeconds: boolean;
  showSecondsInClock: boolean;
  showGreeting: boolean;
  showClockWidget: boolean;
  showWeatherWidget: boolean;
  showQuoteWidget: boolean;
  sidebarCollapsed: boolean;
  railVisible: boolean;
  dockVisible: boolean;
  voiceLanguage: string;
}

export interface Profile {
  name: string;
  tagline: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  accent: string;
}

export interface AppLink {
  id: string;
  name: string;
  target: string;
  kind: "web" | "internal";
  categoryId: string;
  iconText: string;
}

export interface FavoriteItem {
  id: string;
  url: string;
  title: string;
  addedAt: number;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
}

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  priority: TodoPriority;
  due: string | null;
  createdAt: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
  visible: boolean;
}

export interface WidgetsState {
  clock: WidgetPosition;
  weather: WidgetPosition;
  quote: WidgetPosition;
}

export interface DockConfig {
  appIds: string[];
  size: DockSize;
  position: DockPosition;
  labels: boolean;
}

export interface AppWindow {
  id: string;
  appId: InternalAppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
}

export interface ClipboardEntry {
  id: string;
  text: string;
  createdAt: number;
}

export interface WallpaperEntry {
  id: string;
  title: string;
  src: string;
  source: "external" | "local" | "custom";
  credit?: string;
}

export interface SearchProvider {
  id: SearchEngineId;
  label: string;
  urlTemplate: string;
  color: string;
  domain: string;
  keywords: string[];
}

export interface LaunchpadItem {
  id: string;
  name: string;
  mark: string;
  url: string;
  accent: string;
  description: string;
}

export interface LaunchpadGroup {
  id: string;
  title: string;
  subtitle: string;
  items: LaunchpadItem[];
}

export interface WeatherSnapshot {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  code: number;
  isDay: boolean;
  updatedAt: number;
}

export interface SavedLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  updatedAt?: number;
}

export interface BookmarkNode {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  lastVisitTime: number;
  visitCount?: number;
}

export interface StorageStatus {
  backend: "chrome" | "local" | "memory";
  error: string | null;
}
