# Owner todos

Each bullet is: what is needed, why it cannot be settled here, and where.

- **Two screenshots to take by hand.** The at-rest shots are done and committed:
  `docs/img/laptop-light.png` and `docs/img/laptop-dark.png`, captured from the
  shipped pages in headless Edge at 1500 x 1000. Still missing: the lid swung
  open, and the platter turned to a non-zero angle with the readout to match.
  Both need a real click or drag, which headless capture cannot deliver — setting
  the page's own `startOpen` flag and starting `yaw` at 78° rendered
  byte-identical frames, so the initial state is not what the page draws from.
  Where: `docs/screenshots/README.md`.

- **Record the Anatomy kit's version or fingerprint.** Either note the kit
  checkout's commit SHA or run the kit's `anatomy/scripts/fingerprint.mjs` and
  paste the result. `src/build.mjs` records no kit version, so a rebuild is not
  reproducible and the README cannot honestly say which kit the figure was built
  against. The kit snapshot on disk was dated 2026-10-28. Where: README
  `## How it was built` and `## Rebuild it`.

- **Confirm whether `diagram-design` or `web-design-recipes` were actually
  used.** Neither the Anatomy kit nor either built page contains any reference
  to them, so neither is credited. If you opened one while building, point at
  the evidence and it can be added; a skill credited without evidence is a false
  claim in the README. Where: README `## Credits`, `CREDITS.md`.

- **The `Copyright (c) 2026 Ryan` line was not changed to Chen Bin.** It is not
  a template line: `src/build.mjs` reads the Anatomy kit's own `LICENSE` file at
  build time and inlines it at the top of every page, and refuses to ship a page
  without it. Overwriting it would strip a notice the MIT licence requires and
  put a third party's engine under someone else's name. Chen Bin's own copyright
  was added beside it instead, in both pages and in `LICENSE`. If you want the
  Ryan notice gone, remove the embedded engine, not the notice. Where:
  `LICENSE`, `THIRD-PARTY-NOTICES.md`, `dist/*.html`.

- **Decide on GitHub Pages.** Enabling Pages is an account-level action that
  publishes the page at a public URL, so `index.html` was left out pending the
  decision. The landing page (two links plus the embed snippet) is ready to add
  if you want it. Where: README top.

- **Decide whether to publish `src/build.mjs`.** It cannot be run without a
  checkout of the Anatomy kit, which some visitors read as a broken build. It is
  kept for now because the dimensioned geometry and its commentary are the point
  of the repo. Where: `src/build.mjs`.

- **Confirm `Chen Bin` is the name and spelling for the copyright line.**
  Legal attribution. Where: `LICENSE`, README.

- **No Safari or iOS device test, and no screen-reader test.** Every check ran
  in Chrome on one Windows machine; the stage is a figure, not a form control.
  The `role="slider"` usage and the reduced-motion handling would benefit from a
  real screen-reader pass. Where: README `## Checks I ran`, `## Accessibility`.
