# Tasks: Remove Fake Traffic Lights

**Input**: Design docs from `/specs/001-remove-fake-traffic-lights/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Setup

- [ ] T001 Review `specs/001-remove-fake-traffic-lights/plan.md`, `specs/001-remove-fake-traffic-lights/research.md`, and `src/renderer/components/Titlebar.tsx` to confirm the fake traffic-light removal scope and preserve the drag region

---

## Phase 2: Foundational

- [ ] T002 Remove the decorative `<div className="titlebar-dots" data-vd-role="brand-orb" aria-hidden="true">` block from `src/renderer/components/Titlebar.tsx` so `titlebar-brand` becomes the first meaningful child of `.titlebar-left`

---

## Phase 3: User Story 1 - Cleaner Header Chrome (Priority: P1) 🎯 MVP

**Goal**: Show only the real window controls and concierge branding, with no fake inner titlebar traffic lights.

**Independent Test**: Open the app and confirm the inner top bar no longer shows decorative traffic lights, the header stays aligned, and the native window controls still behave normally.

**Acceptance Notes**: No placeholder space should remain; the header should collapse cleanly and keep existing branding/layout hierarchy.

### Implementation

- [ ] T003 [P] [US1] Delete the `.titlebar-dots` and `.titlebar-dots span` rule blocks from `src/renderer/styles/index.css` to remove the unused spacing and color styling
- [ ] T004 [US1] Update `src/renderer/components/Titlebar.test.tsx` to remove the `[data-vd-role="brand-orb"]` assertion while keeping the remaining titlebar checks intact

### Validation

- [ ] T005 [US1] Verify the cleaned header against existing renderer/e2e smoke coverage in `e2e/visual-diff/` and `playwright.config.ts`, confirming no overlap/clipping and unchanged native window controls

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T006 [P] Re-run `src/renderer/components/Titlebar.test.tsx` and the relevant `e2e/visual-diff/` smoke path to confirm the final DOM and layout are stable

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: confirm scope before removing markup
- **Phase 2 → Phase 3**: JSX removal unblocks style/test cleanup
- **Phase 3 → Phase 4**: validate after code changes land
- **US1**: single story; complete it end-to-end before moving on

### Parallel Opportunities

- `T003` and `T004` can run in parallel after `T002`
- `T006` can run alongside any final review work

## Implementation Strategy

1. Complete `T001`–`T002`
2. Apply `T003`–`T004` in parallel
3. Run `T005`
4. Finish with `T006`

