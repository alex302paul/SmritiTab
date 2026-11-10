# Build and source recovery

## Reproducible extension package

The repository now includes a dependency-free Node.js packaging workflow.

Requirements:

- Node.js 20 or newer
- npm (ships with Node.js)

Commands:

```sh
npm run verify
npm run build
npm run verify:dist
```

- `npm run verify` validates the checked-in extension.
- `npm run build` copies only the runtime extension files into a clean `dist/` directory and validates that package.
- `npm run verify:dist` rechecks the generated package.
- `dist/` is generated output and is intentionally ignored by Git.

The build does not rewrite, minify, or otherwise mutate the committed dashboard bundle. It preserves the current Manifest V3 entry points and relative asset paths.

## Important source-recovery limitation

The original React/Vite source project is not present in the available Git history or current branches. The existing `assets/dashboard.bundle.js` is a compiled production artifact. Formatting or renaming that bundle would not recover the original component boundaries, types, hooks, or authoring intent.

For that reason this phase establishes a deterministic, verifiable packaging baseline without pretending that the minified bundle is maintainable source. The bundle remains the compatibility baseline while readable feature modules are reconstructed and behavior is checked.

Do not replace the runtime bundle with a partial rewrite. A future source migration must preserve existing storage keys and user data, and must pass feature parity checks for bookmarks, search, notes, widgets, dock, wallpaper, and focus mode before the extension entry point is switched.

## Runtime package contents

The generated package includes:

- `manifest.json`
- `index.html`
- `background/service-worker.js`
- `assets/dashboard.bundle.js`
- `assets/dashboard.bundle.css`
- `assets/widgets-redesign.css`

No source-only documentation or development scripts are copied into the extension package.
