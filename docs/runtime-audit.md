# Phase 2 — Existing extension audit and feature verification

**Audit date:** 2026-11-10  
**Scope:** Audit the committed SmritiTab extension as it exists. No React/Vite source recovery or framework migration is required.

## Runtime entry points

| File | Responsibility | Result |
|---|---|---|
| `manifest.json` | MV3 metadata, New Tab override, service worker, permissions | Present; JSON/MV3 checked |
| `index.html` | New Tab document and dashboard asset loader | Present; local references resolve |
| `background/service-worker.js` | Context menu and keyboard-command handoff | Present; syntax checked |
| `assets/dashboard.bundle.js` | Dashboard application and feature behavior | Present; syntax checked |
| `assets/dashboard.bundle.css` | Main dashboard styling | Present |
| `assets/widgets-redesign.css` | Widget-row styling overrides | Present |

The committed production bundle is the runtime source of truth and is intentionally preserved.

## Feature inventory grounded in the bundle

| Feature | Evidence found in the committed runtime | Live Chrome check |
|---|---|---|
| Dashboard shell | React root mounted by `index.html` | Pending |
| Search | Search UI, configurable engine, bookmark/history suggestions, keyboard command handoff | Pending |
| Bookmarks | Chrome bookmark tree, create/update/move/remove, search, change listeners, nested folders | Pending |
| Tab actions | Active-tab lookup, tab creation, tab grouping and group styling | Pending |
| History | Chrome history search and recent-page results | Pending |
| Notes | Notes app and persisted note content | Pending |
| To-do | Tasks with priorities and due dates | Pending |
| Calculator | Expression evaluation UI | Pending |
| Clipboard | Clipboard app, browser clipboard read/write calls and locally persisted snippets | Pending |
| Favorites | Pinned links and favorites app | Pending |
| Weather | Open-Meteo forecast/geocoding, saved city and browser geolocation fallback | Pending |
| Clock and quote | Local-time clock settings and daily-thought widget | Pending |
| Wallpaper | Built-in wallpaper choices, random/fixed mode and wallpaper state | Pending |
| Dock / app launcher | Dock visibility/configuration and dashboard app IDs | Pending |
| Settings / profile | Theme, accent, search engine, clock, widget, greeting and profile preferences | Pending |
| Focus mode | Manifest command and pending-action handoff are present; end-to-end behavior needs manual confirmation | Pending |
| Context menu | Selection-to-search context menu and pending-search handoff | Pending |

The inventory proves code paths/labels exist, not that every interaction has passed live testing.

## Persistent data compatibility

The bundle defines the `smrititab:v1` namespace and supports Chrome local storage with a localStorage fallback. Observed keys:

`__meta`, `settings`, `profile`, `categories`, `apps`, `favorites`, `notes`, `todos`, `widgets`, `dock`, `windows`, `clipboard`, `quotes`, `weather`, `location`, `pending-search`, `pending-action`.

**Compatibility rule:** Do not rename, clear, reshape or migrate these keys during feature work unless a deliberate migration is designed, tested against existing user data, and has a rollback strategy.

## Permission map

| Permission | Corresponding feature |
|---|---|
| `storage` | Dashboard persistence and service-worker handoff |
| `bookmarks` | Bookmark browsing and management |
| `history` | Browsing history and search suggestions |
| `tabs` | Active-tab details, opening links and tab groups |
| `tabGroups` | Grouping opened bookmark collections |
| `contextMenus` | Search selected text from the browser context menu |
| `clipboardRead` / `clipboardWrite` | Clipboard interactions |

Host permissions currently include Open-Meteo forecast/geocoding and Unsplash/font assets. Do not remove permissions without checking all runtime usage.

## Static verification completed

- Manifest JSON parses and declares Manifest V3.
- New Tab entry and service-worker paths exist.
- Local script and stylesheet references in `index.html` resolve.
- Dashboard bundle and service worker pass JavaScript syntax checks.
- Required runtime assets are present.
- Dependency-free packaging commands copy runtime assets unchanged into `dist/`.

## Manual Chrome verification matrix

These checks require a real Chrome profile and are **not claimed as completed**:

1. Load repository root and generated `dist/`; confirm New Tab opens without console errors.
2. Verify theme, accent, wallpaper and widget preferences survive browser restart.
3. Create, edit, move, nest and delete bookmarks; test empty folders, search and drag/reorder.
4. Open a folder and subfolders as a Chrome tab group; verify title and color.
5. Save current tab and verify captured title and URL.
6. Search web, bookmarks and history; test keyboard navigation and shortcut.
7. Create/edit/delete notes and tasks; restart Chrome and verify persistence.
8. Test clipboard permission granted/denied and copy/paste.
9. Test weather with saved city, geolocation allowed/denied and network failure.
10. Verify clock, quote, wallpaper mode, dock, favorites and profile settings.
11. Test focus mode and selection context-menu handoff.
12. Test narrow viewport, keyboard-only navigation, visible focus, contrast and reduced motion.
13. Confirm an existing profile retains settings, notes, tasks, bookmarks and favorites after update.

## Phase 2 exit checklist

- [x] Runtime entry points and required assets inventoried.
- [x] Feature inventory grounded in the committed bundle.
- [x] Permissions and persistence namespace documented.
- [x] Existing extension retained as runtime baseline; no forced framework migration.
- [x] Static verification and deterministic packaging workflow documented.
- [x] Manual Chrome verification scenarios documented and handed off to Phase 3/4 QA.

**Phase 2 status: COMPLETE.** Repository/runtime audit, compatibility inventory and static verification are complete. Live-browser execution is intentionally part of the upcoming testing and QA phases, not a claim made by this audit. Source recovery is not required.
