# Screenshots

Two of the four shots are captured and committed to `docs/img/`; the other two
are still to be taken. Nothing here is a placeholder — the README links only
files that exist.

## Captured

`docs/img/laptop-light.png` and `docs/img/laptop-dark.png` — the shipped pages
at rest, lid shut, turn 0, readout `lid shut 0° · yaw 0.0°`, captured in
headless Edge at 1500 x 1000 (full window, not cropped).

## Still to take

Capture these two from the shipped page with the figure filling the frame. Save
them in this directory with these names.

## `light-shut.png`

- File: `dist/laptop-light.html` (light theme).
- What it must show: the lid shut, the machine on the platter at turn 0, with
  the hint, the readout reading `lid shut 0° · yaw 0.0°`, and the credit line
  all visible. This is the hero shot.
- Suggested crop: the plate, roughly 700 × 640 px, centred on the figure.

## `light-open.png`

- File: `dist/laptop-light.html` (light theme).
- What it must show: the lid swung open 100° after a click, the readout reading
  `lid open 100°`, and the platter's index visible against the rim.
- Suggested crop: the plate, roughly 700 × 640 px.

## `dark-shut.png`

- File: `dist/laptop-dark.html` (dark theme).
- What it must show: the same view as `light-shut.png`, in the dark theme — the
  lid shut at turn 0, readout `lid shut 0° · yaw 0.0°`.
- Suggested crop: the plate, roughly 700 × 640 px.

## `dark-turned.png`

- File: `dist/laptop-dark.html` (dark theme).
- What it must show: the machine turned to about a quarter turn, so the
  platter's graduated rim and its index read the angle, and the readout shows a
  non-zero yaw (for example `yaw 78.0°`).
- Suggested crop: the plate, roughly 700 × 640 px.

## How to take them

- Open the file in Chrome and size the window so the figure fills the frame, or
  drive it over the DevTools protocol and screenshot the plate's bounding box —
  `tools/embed-check.mjs` shows the whole CDP setup (`--remote-debugging-port=9222`).
- Do not frame a wide window with large empty margins. The aged-out
  `v4final-*.png` set did that, and it is also light-theme only; do not reuse it.
- Do not reuse `shots/`. Those PNGs predate the shipped build and show a fixed
  layout defect (the old `Fig 3D` label and the hint overlapping the readout).
