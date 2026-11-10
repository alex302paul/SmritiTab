# SmritiTab architecture notes

## Runtime entry points

- `manifest.json`: Chrome Manifest V3 configuration and New Tab override.
- `index.html`: HTML shell loaded by Chrome for each new tab.
- `background/service-worker.js`: stateless event handlers for context-menu and keyboard-command actions.
- `assets/dashboard.bundle.js`: generated React dashboard bundle.
- `assets/dashboard.bundle.css`: generated dashboard stylesheet.
- `assets/widgets-redesign.css`: widget-row presentation overrides.

## Data hand-off

The service worker stores short-lived actions in `chrome.storage.local` under the `smrititab:v1` namespace. The New Tab application consumes these values after it opens.

## Build boundary

The root `manifest.json` and `index.html` are the extension entry points. Run `npm run build` to create a clean `dist/` package. The build copies the manifest, HTML, service worker, and committed assets without modifying the production bundle. `npm run verify` checks the repository package; `npm run verify:dist` checks the generated package.

## Source recovery status

The original React/Vite source tree, package manifest, lockfile, and build configuration were not found in the available current branch or the inspected Git history. The current dashboard bundle is retained as a compatibility baseline, not described as maintainable source.

The prior backup branch contains a different LumiList extension and is not a valid source for this application.

A safe source reconstruction must:

1. Recreate the dashboard as readable React modules with clear feature boundaries.
2. Preserve existing storage keys and user data.
3. Reproduce all current dashboard features before changing the runtime entry point.
4. Add pinned frontend dependencies only when the actual source imports and build entry points are established.
5. Build to a staging directory and validate the unpacked extension before replacing the committed runtime assets.

See [the source recovery map](source-recovery-map.md) and [build/source recovery guide](build-and-source-recovery.md).
