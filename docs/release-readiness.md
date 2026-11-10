# Phase 5 — Release readiness and final QA

**Review date:** 2026-11-10  
**Target branch:** `main`  
**Manifest version:** `1.0.0` (intentionally unchanged)

## Repository-side release gate

- [x] Manifest V3 metadata and New Tab entry point retained.
- [x] Service worker and required runtime assets present.
- [x] Accessibility stylesheet included in the New Tab document and package.
- [x] Existing production dashboard bundle preserved; no risky framework rewrite.
- [x] Existing `smrititab:v1` storage namespace and 17 persisted keys covered by regression checks.
- [x] Permission contract covered by automated checks.
- [x] Reproducible package workflow documented.
- [x] Automated test, source verifier, package build and generated-package verifier pass in GitHub Actions.
- [x] Workflow artifact uploaded and available for download.
- [x] README, architecture, runtime audit and testing documentation cross-checked and updated.
- [x] No public GitHub Release or version tag exists yet; do not imply a published release.

## Latest verified CI

- Workflow: [Extension CI run #19](https://github.com/ashutoshpalhare/SmritiTab/actions/runs/42823173361)
- Commit: `150f56e72bd74078ecf28949f2ecc1765c2067fd`
- Result: **success**
- Automated tests: **14 passed, 0 failed**
- Static verification: passed for repository and generated package (7 required runtime files each).
- Package artifact: `smrititab-extension`, 127,063 bytes.
- Artifact SHA-256: `41664622031bbc43733a5e82b327ad143f2a80085a6ab5c4cea8c2c160b3d7a8`
- Artifact retention: 7 days from upload (expires 2026-11-17).

The artifact is a CI-generated unpacked extension ZIP. Download it from the workflow run's **Artifacts** section, extract it, then load the extracted extension directory through `chrome://extensions` → **Developer mode** → **Load unpacked**.

## Manual release smoke test — still required

These checks need the owner's Chrome profile and cannot be truthfully marked complete by repository CI:

- [ ] Load the repository root and the CI-built package in Chrome; check extension errors and browser console.
- [ ] Confirm New Tab renders correctly in dark and light themes.
- [ ] Test Weather → Clock → Quote order; confirm the clock remains visually larger and the row scrolls horizontally on narrow widths.
- [ ] Keyboard-test search, dock, dialogs, bookmark controls and widget actions; verify visible focus.
- [ ] Verify reduced-motion and forced-colors behavior on supported operating systems.
- [ ] Test bookmarks, nested folders, tab groups, history, clipboard and save-current-tab actions.
- [ ] Create/edit/delete notes and tasks; restart Chrome and verify persistence.
- [ ] Test weather with saved city, location allowed/denied and network unavailable.
- [ ] Test focus-mode and selection context-menu shortcuts.
- [ ] Update an existing profile and confirm settings, bookmarks, notes, tasks and favorites remain intact.

Record any failures as focused fixes before publishing a versioned release. Do not clear extension storage to work around a regression.

## Release decision

**Repository readiness: COMPLETE.** The code, docs, automated checks and CI package pipeline are ready for owner-side Chrome smoke testing.

**Public release readiness: CONDITIONAL.** Do not create a version tag or publish a GitHub Release until the manual smoke test above has been completed on a real Chrome profile. Manifest version remains `1.0.0`; increase it only when preparing that verified release.

## Phase 5 exit checklist

- [x] Final repository and branch state reviewed.
- [x] CI and artifact verified.
- [x] Documentation aligned with actual test coverage and current phase status.
- [x] Release instructions and manual QA gate documented.
- [x] No unsupported claim of live-browser validation or published release.

**Phase 5 status: COMPLETE for repository-side work.** The only remaining gate is the clearly listed real-Chrome smoke test before a public versioned release.
