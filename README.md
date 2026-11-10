# SmritiTab

SmritiTab is a Manifest V3 Chrome extension that replaces Chrome's New Tab page with a personal productivity dashboard.

## Project status

The existing committed dashboard bundle is the production runtime and compatibility baseline. SmritiTab is maintained as an existing extension; recovering or migrating a separate React/Vite source project is not a prerequisite for improving it.

The repository includes a dependency-free Node.js workflow to verify and package the current extension. It copies production assets unchanged. See [Phase 2 runtime audit](docs/runtime-audit.md) for the feature inventory, permissions, persistence keys and manual verification checklist.

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
│   ├── build-extension.mjs      # Deterministic package builder
│   └── verify-extension.mjs     # Manifest, asset and JS syntax checks
├── assets/
│   ├── dashboard.bundle.js      # Current dashboard runtime
│   ├── dashboard.bundle.css     # Dashboard styles
│   └── widgets-redesign.css     # Widget-row overrides
├── background/
│   └── service-worker.js        # Manifest V3 background service worker
├── docs/
│   ├── architecture.md
│   ├── build-and-source-recovery.md
│   ├── runtime-audit.md         # Phase 2 feature and compatibility audit
│   └── source-recovery-map.md   # Runtime baseline and compatibility notes
├── index.html                  # New Tab entry point
├── manifest.json               # Chrome extension manifest
└── README.md
```

## Build and verify

Requires Node.js 20 or newer. The packaging workflow has no third-party npm dependencies.

```sh
npm ci
npm run verify
npm run build
npm run verify:dist
```

The build creates a clean `dist/` folder containing loadable extension files. Load `dist/` through `chrome://extensions` to test the packaged copy. Checked-in production assets are copied unchanged.

## Development conventions

- Keep the Chrome extension manifest at the repository root.
- Keep the current production runtime loadable while making changes.
- Treat `.bundle.js` and `.bundle.css` files as generated/runtime artifacts; avoid casual manual edits.
- Remove permissions only after confirming the dashboard no longer uses the corresponding Chrome API.
- Never commit secrets, API keys or personal tokens.
- Preserve the `smrititab:v1` storage namespace and existing user data.

## Permissions and privacy

- `storage`: dashboard settings, notes, tasks, widgets and cached data.
- `bookmarks`: bookmark folders and links.
- `history`: browsing history and search suggestions.
- `tabs`: active-tab details and opening dashboard tabs.
- `tabGroups`: opening bookmark collections in tab groups.
- `contextMenus`: selection-to-search action.
- `clipboardRead` / `clipboardWrite`: clipboard interactions.

The weather widget first uses a previously selected city. If no city has been saved, it may request browser location access for a local forecast. If location access is denied or unavailable, choose a city from **Weather details** instead; SmritiTab should not silently substitute a different city based on browser timezone.

Location is used to request weather coordinates from Open-Meteo. Review browser extension site permissions to revoke location access. No location permission is requested until the weather widget needs it.

## License

No license file is currently included. Add an explicit license before accepting external contributions.
