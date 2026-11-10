# Build and package the existing extension

## Requirements

- Node.js 20 or newer
- npm (ships with Node.js)

## Commands

```sh
npm ci
npm run verify
npm run build
npm run verify:dist
```

- `npm run verify` checks the checked-in extension.
- `npm run build` copies current runtime files into a clean `dist/` directory and verifies the package.
- `npm run verify:dist` checks the generated package again.
- `dist/` is generated output and is intentionally ignored by Git.

## What the build does

The build copies the existing Manifest V3 runtime files unchanged: `manifest.json`, `index.html`, `background/service-worker.js`, `assets/dashboard.bundle.js`, `assets/dashboard.bundle.css` and `assets/widgets-redesign.css`.

It does not compile React, run Vite, regenerate the production bundle, alter storage keys or migrate user data. No React/Vite source recovery is required.

Load `dist/` through `chrome://extensions` → **Developer mode** → **Load unpacked** to test the packaged extension.

## Compatibility

The committed production assets are the runtime baseline. Keep them intact unless a change has been verified against the current feature inventory and existing user data. Do not replace the app with a partial rewrite.

See [Phase 2 runtime audit](runtime-audit.md) for confirmed feature inventory and remaining manual Chrome checks.
