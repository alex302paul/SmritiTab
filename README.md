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

## Permissions

The manifest currently declares storage, bookmarks, history, clipboard, and context-menu permissions. These are retained temporarily because the bundled dashboard may still use those APIs. They must be audited against recovered source before removal.

## License

No license file is currently included. Add an explicit license before accepting external contributions.
