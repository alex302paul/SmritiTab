# Accessibility and UX QA

## Phase 4 changes

- Keep the generated dashboard bundle untouched; accessibility refinements are loaded as a separate stylesheet.
- Keyboard focus uses the existing orange product accent, with a clear 3px outline and offset.
- Windows High Contrast / forced-colors mode receives a system-color focus outline and non-glass widget borders.
- The generated dashboard stylesheet already includes a `prefers-reduced-motion: reduce` rule that reduces animation and transition duration and disables smooth scrolling. This behavior is retained and regression-tested.

## Manual verification checklist

Run these checks in Chrome with the extension loaded from both the repository root and `dist/`:

1. Use Tab and Shift+Tab from the New Tab page. Every interactive control should show a clearly visible orange focus outline.
2. Activate buttons, links, switches and dialogs using Enter or Space where appropriate.
3. Verify focus remains visible on search inputs, bookmark controls, dock items, widget actions and modal close controls.
4. Enable Windows High Contrast / forced-colors mode and confirm focused controls and widget boundaries remain visible.
5. Enable the operating system's reduced-motion preference and confirm dashboard transitions/animations are minimized.
6. Repeat in light and dark themes and at narrow viewport widths.
7. Confirm existing settings, bookmarks, notes, tasks and favorites remain unchanged after updating the extension.

## Scope and limitations

Automated checks verify stylesheet loading and the presence of the accessibility contracts. They do not prove every runtime control is keyboard-operable or that all text/background combinations meet WCAG contrast thresholds. Those require real-browser and assistive-technology checks. Do not mark this manual matrix complete without executing it.
