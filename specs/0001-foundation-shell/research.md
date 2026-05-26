# Run 1 Research Notes

## Decision 1 — Electron Forge scaffold

**Decision:** Start from the `electron-forge/vite-typescript` template.

**Rationale:** It gives the Electron Forge packaging surface plus the Vite renderer path the roadmap already locks in, without dragging in the bundled webpack template.

**Alternatives considered:** Electron Forge webpack template, electron-vite, manual wiring.

## Decision 2 — Windows installer maker

**Decision:** Use the official Forge NSIS maker, `@electron-forge/maker-nsis`, in the Forge `makers` array.

**Rationale:** The install/update contract is the hard-to-reverse part. Auto-update is deferred, so Squirrel’s update advantage does not matter. NSIS is the better fit for corporate Windows environments and keeps the install story predictable.

**Alternatives considered:** Squirrel.Windows, MSIX, community NSIS forks.

## Decision 3 — Forge maker config shape

**Decision:** Keep the NSIS maker config minimal: a single `makers` entry with `name: '@electron-forge/maker-nsis'` and an empty or narrowly-scoped `config` object.

**Rationale:** Run 1 only needs the installer contract, not updater wiring or advanced signing behavior.

**Alternatives considered:** Custom maker wrapper, updater-oriented config, nonstandard package forks.

## Decision 4 — Playwright Electron smoke pattern

**Decision:** Use Playwright’s `_electron.launch(...)`, then `firstWindow()`, then assert the window title and listen for renderer console events.

**Rationale:** The app is intentionally blank, so the smoke test should prove launchability, expected shell identity, and the absence of launch-time console errors.

**Alternatives considered:** DOM-only browser tests, launch-and-quit only, screenshot assertions.

## Decision 5 — Versioning policy

**Decision:** Let the template and lockfile carry the exact package versions for Run 1.

**Rationale:** The plan needs stable package choices, not speculative version pinning in advance of implementation.

**Alternatives considered:** Hand-picking explicit versions before scaffold generation.
