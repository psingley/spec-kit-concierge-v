# Iteration G proposed fix: about-modal

## Baseline

`about-modal` fails with 19 failures and 10.22% pixel residual. The shipped modal still says `About Concierge`, shows runtime app/git/license text, lacks the design product description, metadata grid, `Documentation` action, and `modal-veil` marker.

## Cause

AboutModal has not been moved onto the shared design modal shell introduced for CustomizeModal. It also uses live version/SHA/license values, while the design contract is a deterministic about panel for the Run 6.5 visual target.

## Fix plan

1. Add a focused AboutModal test for the design heading, description, metadata labels/values, footer buttons, and veil marker.
2. Replace AboutModal markup with `modal-veil`, `modal about-modal`, `modal-head`, `modal-body`, `modal-foot`, and a metadata grid.
3. Keep the existing close behavior and props, but render the deterministic design values required by the visual contract.
4. Reuse the shared modal styles from CustomizeModal and add the small about-specific grid/description/footer styles.
