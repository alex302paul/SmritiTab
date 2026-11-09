# SmritiTab

SmritiTab is a Manifest V3 browser extension that replaces Chrome's New Tab page with a personal productivity dashboard.

## Current repository status

The current dashboard is committed as a production bundle under `assets/`. The original React/Vite source project and package manifest are not present in this repository snapshot. The bundle is therefore treated as a generated artifact, not hand-maintained source code.

The repository has been reorganized to make extension entry points and generated assets explicit. Reconstructing a maintainable dashboard source tree and a reproducible build pipeline is the next engineering step; do not edit the minified bundle directly.

## Install locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository root (the directory containing `manifest.json`).
5. Open a new tab to load SmritiTab.

## Repository layout

```text
SmritiTab/
├── assets/
│   ├── dashboard.bundle.js       # Generated dashboard JavaScript
│   └── dashboard.bundle.css      # Generated dashboard styles
├── background/
│   └── service-worker.js         # Manifest V3 background service worker
├── docs/
│   └── architecture.md           # Runtime boundaries and source recovery notes
├── .editorconfig
├── .prettierrc.json
├── index.html                    # New Tab entry point
├── manifest.json                 # Chrome extension manifest
└── README.md
```

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
