# Iteration 0 Baseline

Status: BLOCKED

The baseline run could not produce design/shipped screenshot pairs. `npm run vd:capture -- signin-fresh` builds the Electron bundles, then Playwright Chromium aborts before page creation:

```text
FATAL:base/apple/mach_port_rendezvous_mac.cc:159 Check failed: kr == KERN_SUCCESS.
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)
```

Because capture stopped before any screenshots, `visual-diff-results.json` and `visual-diff-results-baseline.json` were not created. This is not a visual parity plateau for any screen.
