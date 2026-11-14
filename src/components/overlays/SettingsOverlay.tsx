import {
  Check,
  Download,
  Image as ImageIcon,
  Shuffle,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import {
  APP_REGISTRY,
  INTERNAL_APP_IDS,
  QUOTES,
  SEARCH_PROVIDERS,
  WALLPAPERS,
} from "../../data/defaults";
import { downloadExtensionZip } from "../../services/zipExport";
import type { DockSize, SearchEngineId, ThemeMode } from "../../types/smrititab";

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm text-slate-800 dark:text-slate-100">{label}</span>
        {description && (
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsOverlay() {
  const {
    settings,
    updateSettings,
    apps,
    dock,
    updateDock,
    storageStatus,
    resetDashboard,
    wallpaper,
    closeOverlay,
  } = useSmriti();

  const [customUrlDraft, setCustomUrlDraft] = useState(settings.customWallpaperUrl ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [zipMessage, setZipMessage] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const dockOptions = [
    ...INTERNAL_APP_IDS.filter((id) => id !== "settings" && id !== "profile").map((id) => ({
      id,
      label: APP_REGISTRY[id].title,
    })),
    ...apps.map((a) => ({ id: a.id, label: a.name })),
  ];

  const toggleDockApp = (id: string) => {
    const exists = dock.appIds.includes(id);
    if (exists && dock.appIds.length === 1) return;
    updateDock({
      appIds: exists ? dock.appIds.filter((item) => item !== id) : [...dock.appIds, id],
    });
  };

  const applyCustomWallpaper = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlDraft.trim();
    if (!/^https?:\/\//i.test(trimmed)) return;
    updateSettings({
      wallpaperMode: "fixed",
      fixedWallpaperId: "custom",
      customWallpaperUrl: trimmed,
    });
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setZipMessage(null);
    try {
      const msg = await downloadExtensionZip();
      setZipMessage(msg);
    } catch {
      setZipMessage("Could not generate extension archive.");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay();
      }}
      className="animate-smriti-fade fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md sm:p-6"
    >
      <div className="smriti-glass-adaptive animate-smriti-scale flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-slate-900/10 px-6 py-4 dark:border-white/10">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
            <Sliders className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Appearance, wallpapers, search, dock & storage
            </p>
          </div>
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Close Settings"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="scroll-thin min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {/* Appearance & Theme */}
          <section aria-label="Appearance" className="space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Appearance
            </h2>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-800 dark:text-slate-100">Theme</span>
              <div className="flex gap-1 rounded-xl bg-slate-900/5 p-1 dark:bg-white/6">
                {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateSettings({ theme: mode })}
                    aria-pressed={settings.theme === mode}
                    className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                      settings.theme === mode
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper controls */}
            <div className="space-y-3 rounded-2xl border border-slate-900/8 bg-slate-900/[0.03] p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Wallpaper
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    role="group"
                    aria-label="Wallpaper mode"
                    className="flex gap-1 rounded-xl bg-slate-900/6 p-0.5 dark:bg-white/8"
                  >
                    {(
                      [
                        { id: "random", label: "Random per tab" },
                        { id: "fixed", label: "Fixed" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateSettings({ wallpaperMode: m.id })}
                        aria-pressed={settings.wallpaperMode === m.id}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          settings.wallpaperMode === m.id
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ wallpaperMode: "random" });
                      wallpaper.shuffleNow();
                    }}
                    title="Load another random wallpaper now"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-900/10 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-500/40 hover:text-orange-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-orange-300"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Shuffle
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Current: <strong className="text-slate-700 dark:text-slate-200">{wallpaper.currentEntry?.title ?? "Loading…"}</strong> · {WALLPAPERS.length} curated scenic wallpapers.
              </p>

              <div className="scroll-thin grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {WALLPAPERS.map((wp) => {
                  const selected =
                    settings.wallpaperMode === "fixed" && settings.fixedWallpaperId === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() =>
                        updateSettings({ wallpaperMode: "fixed", fixedWallpaperId: wp.id })
                      }
                      aria-pressed={selected}
                      title={wp.title}
                      className={`group relative h-16 overflow-hidden rounded-xl border-2 transition ${
                        selected
                          ? "border-orange-500 ring-2 ring-orange-500/30"
                          : "border-transparent hover:border-white/40"
                      }`}
                    >
                      <img
                        src={wp.src}
                        alt={wp.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 py-1 text-left text-[10px] font-medium text-white">
                        {wp.title}
                      </span>
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-orange-500 text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={applyCustomWallpaper} className="flex gap-2 pt-1">
                <input
                  type="url"
                  value={customUrlDraft}
                  onChange={(e) => setCustomUrlDraft(e.target.value)}
                  placeholder="Custom wallpaper image URL (https://…)"
                  aria-label="Custom wallpaper URL"
                  className="min-w-0 flex-1 rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!/^https?:\/\//i.test(customUrlDraft.trim())}
                  className="rounded-xl bg-slate-900/8 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/15 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                >
                  Apply URL
                </button>
              </form>
            </div>
          </section>

          {/* Search & Focus Mode */}
          <section aria-label="Search and focus" className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Search & Focus
            </h2>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-800 dark:text-slate-100">
                Default search engine
              </span>
              <select
                value={settings.searchEngine}
                onChange={(e) =>
                  updateSettings({ searchEngine: e.target.value as SearchEngineId })
                }
                aria-label="Default search engine"
                className="rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {SEARCH_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <SwitchRow
              label="Open links & search results in a new tab"
              description="Keeps SmritiTab open while you browse."
              checked={settings.openInNewTab}
              onChange={(v) => updateSettings({ openInNewTab: v })}
            />

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-800 dark:text-slate-100">
                Focus mode clock format
              </span>
              <select
                value={settings.clock24h ? "24" : "12"}
                onChange={(e) => updateSettings({ clock24h: e.target.value === "24" })}
                aria-label="Clock format"
                className="rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
              >
                <option value="12">12 hour</option>
                <option value="24">24 hour</option>
              </select>
            </div>

            <SwitchRow
              label="Show seconds in focus clock"
              checked={settings.showSecondsInClock}
              onChange={(v) => updateSettings({ showSecondsInClock: v })}
            />

            <SwitchRow
              label="Show personal greeting in focus mode"
              checked={settings.showGreeting}
              onChange={(v) => updateSettings({ showGreeting: v })}
            />
          </section>

          {/* Dock */}
          <section aria-label="Dock settings" className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dock
            </h2>

            <SwitchRow
              label="Enable bottom-edge hover dock"
              description="Hover near the bottom-center edge to slide up your apps."
              checked={settings.dockVisible}
              onChange={(v) => updateSettings({ dockVisible: v })}
            />

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Pinned dock apps
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dockOptions.map((opt) => {
                  const active = dock.appIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleDockApp(opt.id)}
                      aria-pressed={active}
                      className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-900/6 text-slate-600 hover:bg-slate-900/12 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/15"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-800 dark:text-slate-100">Dock icon size</span>
              <select
                value={dock.size}
                onChange={(e) => updateDock({ size: e.target.value as DockSize })}
                aria-label="Dock size"
                className="rounded-xl border border-slate-900/10 bg-white/80 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <SwitchRow
              label="Show dock icon labels"
              checked={dock.labels}
              onChange={(v) => updateDock({ labels: v })}
            />
          </section>

          {/* Chrome Extension ZIP & Storage */}
          <section aria-label="Extension and storage" className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Extension Package & Storage
            </h2>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    SmritiTab Chrome Extension (MV3)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Load unpacked in <code className="font-mono">chrome://extensions</code> with full MV3 compatibility.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadZip()}
                  disabled={downloadingZip}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingZip ? "Preparing…" : "Download .zip"}
                </button>
              </div>
              {zipMessage && (
                <p role="status" className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  {zipMessage}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Namespace: <code className="font-mono">smrititab:v1</code> · Backend:{" "}
              <strong className="text-slate-700 dark:text-slate-200">{storageStatus.backend}</strong>{" "}
              ({storageStatus.backend === "chrome"
                ? "chrome.storage.local"
                : storageStatus.backend === "local"
                  ? "localStorage"
                  : "memory"}
              ) · {QUOTES.length} quotes bundled.
            </p>

            {storageStatus.error && (
              <p role="alert" className="text-xs text-rose-500">
                {storageStatus.error}
              </p>
            )}

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset dashboard data
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                <p className="text-xs font-medium text-rose-700 dark:text-rose-200">
                  Reset all SmritiTab settings, Quick Links, notes, tasks, favorites, and clipboard?
                </p>
                <p className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-300/80">
                  Your Chrome browser bookmarks and browsing history are never touched.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={async () => {
                      setResetting(true);
                      await resetDashboard();
                      setResetting(false);
                      setConfirmReset(false);
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
                  >
                    {resetting ? "Resetting…" : "Reset everything"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
