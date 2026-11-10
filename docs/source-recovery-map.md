# Runtime baseline and compatibility notes

## Decision

SmritiTab is an existing, working Manifest V3 Chrome extension. The committed runtime is the product. Reconstructing an original React/Vite source project is not a requirement for maintaining or improving this extension, so no framework migration is planned.

The current dashboard bundle and styles remain the compatibility baseline: `assets/dashboard.bundle.js`, `assets/dashboard.bundle.css`, `assets/widgets-redesign.css`, `index.html`, `background/service-worker.js` and `manifest.json`.

Do not replace these files with a partial rewrite. Improve the current extension in small, verifiable changes and preserve existing behavior and user data.

## Compatibility constraints

- Preserve the `smrititab:v1` storage namespace and existing keys.
- Keep Manifest V3 New Tab and service-worker entry points valid.
- Preserve bookmark CRUD, nested folders, move/reorder and tab-group actions.
- Preserve search, history, notes, tasks, calculator, clipboard, favorites, weather, clock, quote, wallpaper, dock, settings, profile and focus-mode behavior.
- Preserve keyboard commands and selection context-menu handoff.
- Do not remove permissions until bundle and manual runtime checks show the corresponding API is unused.
- Keep production assets loadable until changes pass static checks and live Chrome verification.

## Build workflow

The Node.js scripts package and verify the existing extension. They copy committed runtime assets unchanged into `dist/`; they do not compile React, regenerate bundles or require Vite.

See [Phase 2 runtime audit](runtime-audit.md) for the feature inventory, permission map, storage keys and manual verification matrix. See [Build workflow](build-and-source-recovery.md) for commands.
