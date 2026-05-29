# Iteration F proposed fix: customize-modal

## Baseline

`customize-modal` failed with 25 failures and 16.51% pixel residual. The missing items were the design modal sections (`Theme`, `Layout`, `Flow`), density and activity segmented controls, the clarify scroll toggle copy, the level-2 `Customize` heading, the modal veil marker, and modal/segmented-control style samples.

## Cause

The shipped modal still used the older plain settings layout: direct sections, lowercase density/activity buttons, no veil wrapper, no modal head/body split, no swatches, no design segmented controls, and a different modal panel surface/shadow/padding.

## Fix plan

1. Add a focused CustomizeModal test covering the required heading, section labels, segmented-control buttons, flow toggle copy, and `modal-veil` marker.
2. Replace the modal markup with the design structure: `modal-veil`, `modal-head`, `modal-body customize-body`, `cz-section`, `cz-row`, swatches, segmented controls, and `cz-toggle`.
3. Preserve current preference actions by mapping `Compact` to `compact`, `Regular` to the existing `comfortable` density, `Comfy` to the current comfortable fallback, and keeping activity side values unchanged.
4. Replace the modal CSS with the design panel/head/body and customize-control styling while retaining existing modal class names.
5. Update the visual harness to resolve the contract's generic `.segmented button` style sample to the design `.cz-seg` selector and to derive heading levels from DOM tags when the AOM omits the level.
