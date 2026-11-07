# SmritiTab architecture notes

## Runtime entry points

- `manifest.json`: Chrome Manifest V3 configuration and New Tab override.
- `index.html`: HTML shell loaded by Chrome for each new tab.
- `background/service-worker.js`: stateless event handlers for context-menu and keyboard-command actions.
- `assets/dashboard.bundle.js`: generated React dashboard bundle.
- `assets/dashboard.bundle.css`: generated dashboard stylesheet.

## Data hand-off

The service worker stores short-lived actions in `chrome.storage.local` under the `smrititab:v1` namespace. The New Tab application consumes these values after it opens.

## Source recovery status

The tracked repository currently contains generated frontend assets but no React source tree, package manifest, lockfile, or build configuration. A generated bundle is not a substitute for source code: it is difficult to review, test, maintain, and rebuild safely.

The next source-recovery pass should:

1. Reconstruct the dashboard as readable React modules with clear feature boundaries.
2. Add a pinned package manifest and lockfile.
3. Add a deterministic production build that writes the extension-ready output.
4. Add linting, formatting, and automated tests.
5. Verify every Chrome API usage before reducing manifest permissions.

Do not copy code or assets from third-party extensions. Implement behavior independently and preserve SmritiTab's own product identity.
