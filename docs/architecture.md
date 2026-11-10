# SmritiTab architecture notes

## Runtime entry points

- `manifest.json`: Chrome Manifest V3 configuration and New Tab override.
- `index.html`: HTML shell loaded by Chrome for each new tab; mounts the dashboard at `#root`.
- `background/service-worker.js`: event handlers for context-menu and keyboard-command actions.
- `assets/dashboard.bundle.js`: committed dashboard application runtime.
- `assets/dashboard.bundle.css`: dashboard stylesheet.
- `assets/widgets-redesign.css`: widget-row presentation overrides.

The existing extension and its committed assets are the runtime source of truth. A separate React/Vite source reconstruction is not a prerequisite for maintenance or feature work.

## Data hand-off and persistence

The service worker stores short-lived actions in `chrome.storage.local` under the `smrititab:v1` namespace. The New Tab application consumes these values after it opens.

The dashboard also uses the same namespace for settings and feature data, with a localStorage fallback in environments where Chrome extension storage is unavailable. Preserve existing keys and data shapes unless a tested migration is explicitly planned.

## Build boundary

The root `manifest.json` and `index.html` are the extension entry points. Run `npm run build` to create a clean `dist/` package. The build copies the manifest, HTML, service worker and committed assets without modifying the production bundle.

- `npm run verify` checks the repository package.
- `npm run build` creates and verifies the package.
- `npm run verify:dist` checks the generated package.

This is a packaging workflow, not a React/Vite compilation pipeline.

## Compatibility rules

- Preserve the Manifest V3 New Tab override and service-worker entry points.
- Preserve all current dashboard feature behavior and Chrome API integrations.
- Preserve the `smrititab:v1` namespace and existing user data.
- Do not remove a permission until runtime usage has been checked.
- Keep the current production assets loadable until changes pass static checks and live Chrome verification.

See [Phase 2 runtime audit](runtime-audit.md) for the feature inventory, permission map, persistence keys and manual verification matrix. See [build workflow](build.md) for packaging commands.
