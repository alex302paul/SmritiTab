# SmritiTab

SmritiTab is a Manifest V3 browser extension that replaces Chrome's New Tab page with a personal productivity dashboard.

## Current repository status

The current dashboard is committed as a production bundle under `assets/`. The original React/Vite source project and package manifest are not present in this repository snapshot. The bundle is therefore treated as a generated artifact, not hand-maintained source code.

The repository now includes a dependency-free, reproducible extension packaging workflow. The original React/Vite source is still unavailable; the committed dashboard bundle remains the compatibility baseline and must not be edited directly. See [Build and source recovery](docs/build-and-source-recovery.md) for the verified limitation and build commands.

## Install locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository root (the directory containing `manifest.json`).
5. Open a new tab to load SmritiTab.

## Repository layout

```text
SmritiTab/
├── scripts/
│   ├── build-extension.mjs      # Reproducible extension package builder
│   └── verify-extension.mjs     # Manifest, asset and JS syntax checks
├── assets/
│   ├── dashboard.bundle.js       # Generated dashboard JavaScript
│   └── dashboard.bundle.css      # Generated dashboard styles
├── background/
│   └── service-worker.js         # Manifest V3 background service worker
├── docs/
│   ├── architecture.md           # Runtime boundaries
│   ├── build-and-source-recovery.md
│   └── source-recovery-map.md     # Audit baseline and parity requirements
├── .editorconfig
├── .prettierrc.json
├── index.html                    # New Tab entry point
├── manifest.json                 # Chrome extension manifest
└── README.md
```

## Build and verify

Requires Node.js 20 or newer. No third-party npm packages are required for the packaging workflow.

```sh
npm ci
npm run verify
npm run build
npm run verify:dist
```

The build creates a clean `dist/` folder containing only the loadable extension files. Load `dist/` through `chrome://extensions` to test the packaged copy. The checked-in production assets are copied unchanged.

## Development conventions

- Keep the Chrome extension manifest at the repository root.
- Keep browser-extension entry points in clearly named folders.
- Treat files ending in `.bundle.js` or `.bundle.css` as generated output.
- Format hand-written JavaScript, JSON, HTML, and CSS with Prettier.
- Keep permissions minimal; remove a permission only after confirming the dashboard no longer uses its corresponding Chrome API.
- Never commit secrets, API keys, or personal tokens.

## Permissions and privacy

SmritiTab requests the following Chrome permissions for specific dashboard features:

- `storage`: persist dashboard settings, notes, tasks, widgets, and cached data.
- `bookmarks`: read and manage bookmark folders and links.
- `history`: provide the browsing-history view.
- `tabs`: read the active page title and URL for **Save current tab**, and open dashboard tabs.
- `tabGroups`: open selected bookmark collections in a tab group.
- `contextMenus`: provide the selection-to-search context-menu action.
- `clipboardRead` / `clipboardWrite`: power the clipboard manager and copy/paste actions.

The weather widget first uses a previously selected city. If no city has been saved, it may request browser location access to obtain coordinates for a local forecast. If location access is denied or unavailable, choose a city from **Weather details** instead; SmritiTab should not silently substitute a different city based on the browser timezone.

Location is used to request weather coordinates from Open-Meteo. Review the browser's extension site permissions if you want to revoke location access. No location permission is requested until the weather widget needs it.

## License

No license file is currently included. Add an explicit license before accepting external contributions.
