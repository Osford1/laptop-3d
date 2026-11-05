# Credits

## Skills used

**`anatomy`** — a Hermes/Claude skill for building isometric SVG illustrations
(`creative/anatomy`). Its turning engine and its `--anatomy-*` CSS token set
produced the isometric projection, the solid primitives, the painter's-order
solver, the plate chrome and the two themes in both built pages.

This is the only skill I can evidence in the files:

- `src/build.mjs` says so in its header: `Built with the anatomy kit's turning
  engine (skill: creative/anatomy, references/3d.md)`.
- Both pages carry the kit's `--anatomy-*` custom properties verbatim.
- Both pages print a credit line under the figure: `Drawing engine: the
  Anatomy kit (MIT, © 2026 Ryan).`

`diagram-design` and `web-design-recipes` were named in the original brief but
are **not** cited here: neither the kit nor the built pages contain any
reference to them. If either was used, it needs a fingerprint before it can be
credited. See `docs/owner-todos.md`.

## Third-party code

**Anatomy kit** by Ryan (@wheresryan22) — https://github.com/wheresryan22/anatomy
— MIT. The engine is inlined into both pages; the full licence is in
`THIRD-PARTY-NOTICES.md` and at the top of each built page.

## This repo

The laptop's dimensions, its parts, the build script (`src/build.mjs`) and the
interaction harness (`src/live.js`, `tools/embed-check.mjs`) are
Copyright (c) 2026 Chen Bin, MIT. See `LICENSE`.
