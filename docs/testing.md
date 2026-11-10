# Automated testing and CI

SmritiTab uses Node.js built-in test tooling; no third-party test framework or runtime dependency is required.

## Run locally

```sh
npm ci
npm test
npm run verify
npm run build
npm run verify:dist
```

## Automated coverage

The current regression suite covers:

- Service-worker context-menu registration on install.
- Coalescing overlapping install/startup registration.
- Selection text handoff into extension storage and dashboard tab creation.
- Ignoring unrelated context-menu events and empty selections.
- Keyboard command handoff for search and focus mode.
- Ignoring unknown keyboard commands.
- Required Chrome permissions for implemented dashboard features.
- The `smrititab:v1` storage namespace and persisted key compatibility.
- Acceptance of the checked-in runtime by the static verifier.
- Rejection of a package with missing required runtime assets.

The tests use a mocked Chrome API for service-worker behavior. They do not replace real-browser tests of Chrome's actual permissions, bookmarks, clipboard, tab groups, geolocation, rendering or persistence behavior.

## GitHub Actions

The `Extension CI` workflow runs on pushes to `main`, pull requests and manual dispatch. It installs from the lockfile, runs tests, verifies the checked-in runtime, creates `dist/`, verifies the generated package and uploads the unpacked extension as a seven-day workflow artifact.

A successful CI run proves the automated checks and package pipeline passed. It does not certify the manual Chrome QA matrix; see [runtime audit](runtime-audit.md).
