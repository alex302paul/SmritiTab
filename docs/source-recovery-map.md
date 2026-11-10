# Source recovery map

## Audit result

The current `main` branch contains a production React dashboard bundle, but not its original source project.

Verified on 2026-11-10:

- `assets/dashboard.bundle.js` — 376,834 bytes; bundled React application.
- `assets/dashboard.bundle.css` — 55,263 bytes; generated stylesheet.
- `assets/widgets-redesign.css` — 3,730 bytes; current widget-row overrides.
- `index.html` — mounts the dashboard bundle into `#root`.
- `background/service-worker.js` — separate Manifest V3 service worker.
- No `src/`, `package.json`, lockfile, Vite config, TypeScript config, or source map exists on `main`.
- Git history queries for `src` and `package.json` return no commits.
- `Proper-Working-Prototype-V1` has the same generated-asset-only layout.
- `backup/pre-reset-2026-11-06` contains a different LumiList extension (version 2.1.12), not SmritiTab's React source. It must not be used as a source replacement.

The existing dashboard bundle is the runtime baseline. Do not overwrite it with a partial rewrite or a placeholder app.

## Runtime feature inventory

The current bundle includes React root/context usage and browser integrations for:

- Chrome storage and bookmarks.
- Chrome tabs and tab groups.
- Chrome history.
- Search and keyboard interactions.
- Notes and task-style dashboard content.
- Weather via Open-Meteo and browser geolocation.
- Clock and quote widgets.
- Wallpaper/image loading.
- Dock and internal app navigation.
- Focus mode.
- Bookmark manager with folder operations, drag/reorder, resizing and tab-group actions.

This is a behavioral inventory, not a claim that every feature has been exhaustively tested.

## Recovery strategy

1. Treat the committed bundle and styles as the golden compatibility baseline.
2. Reconstruct readable React modules from observed behavior, keeping feature boundaries explicit.
3. Move shared browser API access behind typed/adaptable service modules.
4. Recreate the current visual structure and interactions before changing design or data formats.
5. Add a pinned dependency manifest and lockfile only when the source entry points and actual dependency set are known.
6. Build into a staging directory first; compare output and load the unpacked staging extension before switching the production entry point.
7. Keep the existing production assets available until parity checks pass.

## Proposed source boundaries

- `src/app/` — application shell, routes/views, global providers.
- `src/features/search/` — search input, suggestions and keyboard actions.
- `src/features/bookmarks/` — bookmark dashboard and manager.
- `src/features/widgets/` — weather, clock and quote.
- `src/features/notes/` — notes and task content.
- `src/features/dock/` — dock and internal app launcher.
- `src/features/focus/` — focus mode.
- `src/features/wallpaper/` — background selection and persistence.
- `src/shared/chrome/` — typed wrappers around Chrome extension APIs.
- `src/shared/storage/` — namespaced persistence and migrations.
- `src/styles/` — tokens, global styles and feature styles.
- `background/service-worker.js` — remains a separate MV3 entry point.

## Non-negotiable parity checks

- Existing user data remains readable; no storage namespace/key migration without an explicit migration.
- Bookmark CRUD, nested folders, move/reorder, resizing and open-as-tab-group behavior remain intact.
- Weather location fallback and manual city selection remain intact.
- Search, keyboard shortcuts, dock, notes, wallpaper and focus mode remain available.
- The current orange/black visual identity, theme behavior and horizontal Weather–Clock–Quote row are preserved.
- The existing production bundle remains loadable until the staged build passes static and manual Chrome checks.
