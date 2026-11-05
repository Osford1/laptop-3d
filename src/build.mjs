/**
 * A laptop, turned about the z axis.
 * Built with the anatomy kit's turning engine (skill: creative/anatomy, references/3d.md).
 * Copyright (c) 2026 Chen Bin. MIT. The turning engine this script imports is the kit's, not
 * mine; the laptop's dimensions, parts and controls are mine. See THIRD-PARTY-NOTICES.md.
 *
 * Convention (as asked): the machine stands in the usual x y z frame. With the lid
 * shut the base's underside lies flat on the xy plane — the platter's top face *is*
 * z = 0 — and every height is read on z. x runs to the right-hand side of the base,
 * y back to front (the hinge is at the back), z up.
 *
 * Motion:
 *   machine — a turn group about the z axis through the origin (the yaw)
 *   lid     — a hinge group, axis +x, through a point 105 mm back of centre, 15.9 mm up
 *
 * Run: node src/build.mjs [--audit [--quick]] [--verify] [--dark]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* The Anatomy kit is a separate MIT project (github.com/wheresryan22/anatomy). It is needed to
   *rebuild* this figure; the built pages in dist/ need nothing. Point ANATOMY_KIT at a checkout. */
const SKILL = process.env.ANATOMY_KIT;
if (!SKILL) throw new Error("set ANATOMY_KIT to a checkout of github.com/wheresryan22/anatomy");
const k = await import(pathToFileURL(`${SKILL}/kit/iso-kit.mjs`).href);
const G = await import(pathToFileURL(`${SKILL}/kit/lathe.mjs`).href);
const A = await import(pathToFileURL(`${SKILL}/kit/audit.mjs`).href);
const { turning } = await import(pathToFileURL(`${SKILL}/kit/turn-build.mjs`).href);
const TA = await import(pathToFileURL(`${SKILL}/kit/turn-audit.mjs`).href);
const { turnScript } = await import(pathToFileURL(`${SKILL}/scripts/inline-kit.mjs`).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const argv = process.argv.slice(2);
const theme = argv.includes("--dark") ? "dark" : "light";   // the ask: the default light colour
const verify = argv.includes("--verify");

const WIDTH = 660;
const HEIGHT = 500;
/* The kit's own axonometric azimuth, which draws the ground the way the references do: the
   axes fan towards the viewer and +x reads to the right. In this view the machine must hang
   its hinge away, towards -y, with the keyboard facing the viewer — so the case is swung
   half a turn by the mounting group below rather than the camera being moved. */
const AZIMUTH = 40;
const ELEVATION = 31;

/* ── the machine, in millimetres ─────────────────────────────────────────── */
const W = 312;                     // footprint across x
const D = 214;                     // footprint across y
const CORNER = 14;
const FOOTPRINT = { x: -W / 2, y: -D / 2, w: W, d: D };
const CHAS_Z = 11;                 // chassis top
const DECK_Z = 12.4;               // palm rest and rails top
const TRAY_Z = 11.6;               // keyboard well floor
const TRAY = { x: -136, y: -4, w: 272, d: 72 };
const KEY = { w: 16.4, d: 11.8, dx: 18.4, dy: 13.4, r: 1.7 };
const KEY_X0 = -128.8;
const KEY_Y0 = 0.3;
const KEY_ROWS = 5;
const KEY_COLS = 14;
const HINGE = [0, 105, 15.9];      // the hinge axis: 105 back, 15.9 up
const HINGE_R = 3.5;               // barrel radius; its underside sits on the deck at 12.4
const REAR = HINGE[1] - HINGE_R;   // 101.5 — the barrel's front tangent = the display's rear face
const SCREEN = { x: -156, y: -104, w: 312, d: 205.5 };   // display plan, y -104 … 101.5
const SCREEN_R = 14;               // the two front corners
const BEZEL_Z0 = 13.6;             // display underside
const BEZEL_Z1 = 17.2;             // bezel / cover joint
const SHELL_Z1 = 21.8;             // shut lid top
const OPEN = -100;                 // the lid opens 100° from shut
/* The kit draws its ground with the world frame as its references do — +x to the right and
   +y down the page — which puts the model's hinge side (modelled at +y) towards the viewer.
   The case is mounted half a turn round from that, so the keyboard faces the viewer; see the
   mounting group below. */
const MOUNT = 180;
const PLATTER_R = 200;
const PLATTER_Z0 = -6;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const FLOOR = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };

/** A rounded rectangle as a ring of points, per-corner radii in the kit's order:
 *  [right-bottom, right-top, left-top, left-bottom], counter-clockwise from the
 *  right edge — the same winding k.roundedPlan() uses. */
const ring = ({ x, y, w, d }, radii = [0, 0, 0, 0], steps = 6) => {
  const R = radii.map((r) => Math.max(0, Math.min(r, w / 2, d / 2)));
  const corners = [
    [x + w - R[0], y + R[0], -90, R[0]],
    [x + w - R[1], y + d - R[1], 0, R[1]],
    [x + R[2], y + d - R[2], 90, R[2]],
    [x + R[3], y + R[3], 180, R[3]],
  ];
  const out = [];
  for (const [cx, cy, start, r] of corners) {
    const count = r > 0 ? steps : 0;
    for (let step = 0; step <= count; step++) {
      const angle = (start + (count ? (90 * step) / count : 45)) * (Math.PI / 180);
      out.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }
  return out;
};
const circleRing = (cx, cy, r, steps = 64) =>
  Array.from({ length: steps }, (_, i) => [cx + r * Math.cos((i / steps) * 2 * Math.PI), cy + r * Math.sin((i / steps) * 2 * Math.PI)]);

/** SVG path helpers, for the flat markings that ride on a part's face. */
const rr = (x, y, w, d, r) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + d - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + d}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + d - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const circ = (cx, cy, r) => `M${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}Z`;
const disk = (d, tone) => `<path class="iso-fill" data-tone="${tone}" d="${d}"/>`;
const turn = (deg) => {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return (p) => {
    const dy = p[1] - HINGE[1];
    const dz = p[2] - HINGE[2];
    return [p[0], HINGE[1] + dy * c - dz * s, HINGE[2] + dy * s + dz * c];
  };
};

/* frame the shot on the shut machine, the platter, and the lid at full open —
   either way round, so the sign of the hinge is settled by looking at the render —
   and with the mounting applied, since that is how the case will stand */
const displayPoints = k.boxCorners(SCREEN, BEZEL_Z0, SHELL_Z1)
  .flatMap((p) => [p, turn(OPEN)(p), turn(-OPEN)(p)])
  .map(([x, y, z]) => [-x, -y, z]);
export const P = k.fitProjection(
  [...k.boxCorners({ x: -PLATTER_R, y: -PLATTER_R, w: 2 * PLATTER_R, d: 2 * PLATTER_R }, PLATTER_Z0, 0), ...k.boxCorners(FOOTPRINT, 0, SHELL_Z1), ...displayPoints],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: AZIMUTH, elevation: ELEVATION },
);
const at = (p) => k.iso(p, P);

/* ── the machine opens ───────────────────────────────────────────────────── */
export const R = A.recorder(P);
const put = (item) =>
  R.put({ ...item, shapes: item.shapes.map((shape, index) => R.solid(Object.assign(shape, { name: shape.name ?? (index ? `${item.name}#${index + 1}` : item.name) }))) });
const T = turning(P, { recorder: R });

/* The mounting: a turn group of its own holding the machine's home orientation. The case is
   modelled hinge-to-+y; this swings it half a turn about z so that in the kit's view its
   keyboard faces the viewer and its hinge and lid read away up the page. It is rigid, and the
   machine's own yaw is measured from here, so the case still opens at turn 0 and the readout
   stays honest: the case's first turn is a property of how it is mounted, not of how far it
   has been turned. */
const mount = T.group("mount", { turn: { pivot: [0, 0] } });
const machine = T.group("machine", { parent: mount, turn: { pivot: [0, 0] } });
const lid = T.group("lid", { parent: machine, hinge: { point: HINGE, axis: [1, 0, 0], range: [OPEN, 0] } });
const base = T.layer("base");
const top = T.layer("lid");
T.stack(["back", "base", "lid"]);

/* ── the platter: the xy plane made visible ──────────────────────────────── */
function platter() {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * Math.PI;
    const major = i % 6 === 0;
    const r0 = PLATTER_R - (major ? 13 : 7);
    ticks.push(L(k.segment([r0 * Math.cos(a), r0 * Math.sin(a), 0], [PLATTER_R * Math.cos(a), PLATTER_R * Math.sin(a), 0], P), { tone: major ? "mid" : "faint" }));
  }
  const wedge = [[-13, -190], [13, -190], [0, -171]];
  const mark = `M${wedge.map((p) => at([p[0], p[1], 0]).map((n) => n.toFixed(1)).join(",")).join("L")}Z`;
  const axes = [
    L(k.segment([-PLATTER_R + 22, 0, 0], [-22, 0, 0], P), { tone: "hi" }),
    L(k.segment([22, 0, 0], [PLATTER_R - 22, 0, 0], P), { tone: "hi" }),
    L(k.segment([0, -PLATTER_R + 22, 0], [0, -22, 0], P), { tone: "hi" }),
    L(k.segment([0, 22, 0], [0, PLATTER_R - 22, 0], P), { tone: "hi" }),
  ];
  const labels = [
    k.faceTextSvg(k.topMatrix([184, 0], 0.2, P), "+x", { size: 9, tone: "hi" }),
    k.faceTextSvg(k.topMatrix([0, 184], 0.2, P), "+y", { size: 9, tone: "hi" }),
    k.faceTextSvg(k.topMatrix([-184, 0], 0.2, P), "−x", { size: 9, tone: "faint" }),
    k.faceTextSvg(k.topMatrix([0, -184], 0.2, P), "−y", { size: 9, tone: "faint" }),
  ];
  const svg =
    S(k.cylinder(0, 0, PLATTER_R, PLATTER_Z0, -PLATTER_Z0, P, 72, 1.6), {
      tone: "mid",
      inner: L(k.ring(0, 0, PLATTER_R - 15, 0, P, 72), { tone: "faint" }) + ticks.join("") + axes.join("") + labels.join("") + disk(mark, "hi") + k.faceTextSvg(k.topMatrix([0, -160], 0, P), "0", { size: 10, tone: "hi" }),
    }) + L(k.ring(0, 0, 120, 0, P, 64), { tone: "faint", dashed: true });
  put({ name: "platter", layer: "back", at: [0, 0, PLATTER_Z0], bias: 4, svg, shapes: [A.cylinder(0, 0, PLATTER_R, PLATTER_Z0, -PLATTER_Z0, { ground: true })] });

}

/* ── the base: chassis, deck, keyboard ───────────────────────────────────── */
function shell() {
  const poly = ring(FOOTPRINT, [CORNER, CORNER, CORNER, CORNER], 6);
  const chassis = T.prism({
    name: "base.chassis",
    group: machine,
    layer: base,
    F: FLOOR,
    polygon: poly,
    s0: 0,
    s1: CHAS_Z,
    tone: "mid",
    crease: "lo",
    bevel: 1.1,
    details: { seams: [2.0] },
    reason: "the case: one moulding, flush on the platter at z = 0, 11 mm tall",
  });
  /* the deck is a frame around the keyboard well — every joint is a real wall of the well */
  const deckParts = [
    { name: "base.deck.front", plan: { x: -156, y: -107, w: 312, d: 103 }, radii: [CORNER, 0, 0, CORNER] },
    { name: "base.deck.left", plan: { x: -156, y: -4, w: 20, d: 111 }, radii: [0, 0, 0, CORNER] },
    { name: "base.deck.right", plan: { x: 136, y: -4, w: 20, d: 111 }, radii: [0, CORNER, 0, 0] },
    { name: "base.deck.back", plan: { x: TRAY.x, y: TRAY.y + TRAY.d, w: TRAY.w, d: 107 - (TRAY.y + TRAY.d) }, radii: [0, 0, 0, 0] },
  ];
  const deck = {};
  for (const part of deckParts) {
    deck[part.name] = T.prism({
      name: part.name,
      group: machine,
      layer: base,
      F: FLOOR,
      polygon: ring(part.plan, part.radii, 6),
      s0: CHAS_Z,
      s1: DECK_Z,
      tone: "mid",
      crease: "faint",
      bevel: 0.7,
      reason: "a panel of the deck; its joints fall on the keyboard well's walls",
    });
  }
  T.prism({
    name: "base.tray",
    group: machine,
    layer: base,
    F: FLOOR,
    polygon: ring(TRAY, [4, 4, 4, 4], 4),
    s0: CHAS_Z,
    s1: TRAY_Z,
    tone: "lo",
    crease: "faint",
    reason: "the floor of the keyboard well, 0.8 mm below the deck",
  });
  for (let row = 0; row < KEY_ROWS; row++) {
    for (let col = 0; col < KEY_COLS; col++) {
      T.prism({
        name: `key.${row}.${col}`,
        group: machine,
        layer: base,
        F: FLOOR,
        polygon: ring({ x: KEY_X0 + col * KEY.dx, y: KEY_Y0 + row * KEY.dy, w: KEY.w, d: KEY.d }, [KEY.r, KEY.r, KEY.r, KEY.r], 3),
        s0: TRAY_Z,
        s1: DECK_Z,
        tone: "hi",
        crease: "lo",
        bevel: 0.3,
        reason: "a keycap, 0.8 mm proud of the deck",
      });
    }
  }
  /* the trackpad: a mark let into the palm rest, and the ports, cut into the two side walls */
  const padF = { x: -64, y: -96, w: 128, d: 68 };
  T.plane({
    part: deck["base.deck.front"],
    o: [padF.x, padF.y, DECK_Z + 0.02],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg:
      disk(rr(0, 0, padF.w, padF.d, 7), "hi") +
      L(rr(0, 0, padF.w, padF.d, 7), { tone: "faint" }) +
      L(rr(9, 9, padF.w - 18, padF.d - 18, 4), { tone: "faint", dashed: true }),
  });
  const port = (d, r) => disk(rr(d, r[0], r[1], r[2], r[3]), "lo") + L(rr(d, r[0], r[1], r[2], r[3]), { tone: "mid" });
  const rightPorts =
    port(6, [-4, 13, 8, 1.4]) + port(23, [-4, 13, 8, 1.4]) + port(42, [-2.5, 9, 5, 2.4]) + port(56, [-2.5, 9, 5, 2.4]) +
    disk(circ(74, 0, 4), "lo") + L(circ(74, 0, 4), { tone: "mid" });
  T.plane({ part: chassis, o: [156.02, -70, 5.5], u: [0, 1, 0], v: [0, 0, 1], normal: [1, 0, 0], svg: rightPorts });
  const leftPorts = port(14, [-4.5, 16, 9, 1.4]) + port(38, [-2.5, 9, 5, 2.4]) + port(54, [-2.5, 9, 5, 2.4]);
  T.plane({ part: chassis, o: [-156.02, -70, 5.5], u: [0, 1, 0], v: [0, 0, 1], normal: [-1, 0, 0], svg: leftPorts });
}

/* ── the lid: barrel, bezel, cover, glass ────────────────────────────────── */
function screen() {
  const plan = SCREEN;
  const radii = [SCREEN_R, 0, 0, SCREEN_R];
  const cover = T.prism({
    name: "lid.cover",
    group: lid,
    layer: top,
    F: FLOOR,
    polygon: ring({ x: plan.x, y: plan.y, w: plan.w, d: plan.d }, radii, 6),
    s0: BEZEL_Z1,
    s1: SHELL_Z1,
    tone: "mid",
    crease: "lo",
    bevel: 0.8,
    details: { seams: [BEZEL_Z1 + 0.5] },
    reason: "the cover: the shut lid's top face, 4.6 mm thick",
  });
  const bars = [
    { name: "lid.bezel.left", plan: { x: plan.x, y: plan.y, w: 14, d: plan.d }, radii: [SCREEN_R, 0, 0, SCREEN_R] },
    { name: "lid.bezel.right", plan: { x: plan.x + plan.w - 14, y: plan.y, w: 14, d: plan.d }, radii: [0, 0, 0, 0] },
    { name: "lid.bezel.front", plan: { x: plan.x + 14, y: plan.y, w: plan.w - 28, d: 12 }, radii: [0, 0, 0, 0] },
    { name: "lid.bezel.back", plan: { x: plan.x + 14, y: plan.y + plan.d - 12, w: plan.w - 28, d: 12 }, radii: [0, 0, 0, 0] },
  ];
  const bezel = {};
  for (const bar of bars) {
    bezel[bar.name] = T.prism({
      name: bar.name,
      group: lid,
      layer: top,
      F: FLOOR,
      polygon: ring(bar.plan, bar.radii, 6),
      s0: BEZEL_Z0,
      s1: BEZEL_Z1,
      tone: "lo",
      crease: "faint",
      bevel: 0.5,
      reason: "the bezel around the glass, at the lid's closed underside",
    });
  }
  const glassPlan = { x: plan.x + 14, y: plan.y + 12, w: plan.w - 28, d: plan.d - 24 };
  const glass = T.prism({
    name: "lid.glass",
    group: lid,
    layer: top,
    F: FLOOR,
    polygon: ring(glassPlan, [2, 2, 2, 2], 3),
    s0: BEZEL_Z0,
    s1: BEZEL_Z1,
    tone: "lo",
    crease: "faint",
    reason: "the panel between the bezel's bars",
  });
  const gx = glassPlan.x + 6;
  const gy = glassPlan.y + 6;
  const gw = glassPlan.w - 12;
  const gd = glassPlan.d - 12;
  T.plane({
    part: glass,
    o: [gx, gy, BEZEL_Z0 - 0.02],
    u: [1, 0, 0],
    v: [0, 1, 0],
    normal: [0, 0, -1],
    svg:
      disk(rr(0, 0, gw, gd, 2.5), "faint") +
      L(rr(0, 0, gw, gd, 2.5), { tone: "lo" }) +
      L(`M3 ${gd * 0.62}H${gw * 0.62}` + `M3 ${gd * 0.72}H${gw * 0.44}` + `M3 ${gd * 0.82}H${gw * 0.53}`, { tone: "faint" }),
  });
  T.plane({
    part: bezel["lid.bezel.back"],
    o: [plan.x + 132, plan.y + plan.d - 6, BEZEL_Z0 - 0.02],
    u: [1, 0, 0],
    v: [0, 1, 0],
    normal: [0, 0, -1],
    svg: disk(rr(-18, -3.5, 36, 7, 3.5), "faint") + L(rr(-18, -3.5, 36, 7, 3.5), { tone: "lo" }) + disk(circ(0, 0, 2.1), "lo"),
  });
  T.plane({
    part: cover,
    o: [0, -6, SHELL_Z1 + 0.02],
    u: [1, 0, 0],
    v: [0, 1, 0],
    normal: [0, 0, 1],
    svg: disk(circ(0, 0, 7.6), "hi") + L(circ(0, 0, 7.6), { tone: "lo" }) + L(circ(0, 0, 4.4), { tone: "lo" }),
  });
  T.round({
    name: "lid.barrel",
    group: lid,
    layer: top,
    F: G.frameOf([-96, HINGE[1], HINGE[2]], [1, 0, 0], [0, 0, 1]),
    s0: 0,
    s1: 192,
    r: HINGE_R,
    tone: "mid",
    crease: "lo",
    reason: "the barrel on the hinge axis: it stays put while the lid swings",
  });
}

platter();
shell();
screen();

/* ── the audit: geometry, supports, painter order along the swing ────────── */
const poses = () => {
  const out = [];
  for (let d = 0; d <= 100; d += 2.5) out.push({ mount: MOUNT, lid: -d, machine: 0 });
  for (let a = 0; a < 360; a += 7.5) out.push({ mount: MOUNT, lid: OPEN, machine: a });
  return out;
};
const out = T.build({ statics: R.items, poses, verify });
A.settle(R, P);
const layerOf = (name) => R.items.filter((item) => item.layer === name).sort((a, b) => a.key - b.key).map((item) => item.svg);
const BACK = layerOf("back");
if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => ({ mount: MOUNT, lid: -Math.min(100, x / 3.6), machine: x }), from: 0, to: 360, frame: 2.5 },
    quick: argv.includes("--quick"),
    log: argv.includes("--verbose") ? (text) => console.log(`  … ${text}`) : null,
  });
}

const LABEL =
  "A laptop on a graduated platter: the case sits on the xy plane with the lid hinged along x at the back. Click the machine to swing the lid 100° about its hinge; drag in a circle about it to turn the whole machine about the z axis, with the platter's index showing how far it has come round.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;
const stage = `<div class="iso-stage iso-turn lp-stage" tabindex="0" role="slider" aria-label="A laptop turned about the z axis: click it to open or shut the lid, drag in a circle about it to turn it, press R to reset" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0" aria-valuetext="laptop shut, turned 0 degrees">${backSvg}${out.layerSvg("base", { width: WIDTH, height: HEIGHT })}${out.layerSvg("lid", { width: WIDTH, height: HEIGHT })}</div>`;

/* The runtime takes its opening values from what the builder packed, and the build's
   last pose leaves the lid wide open — so state the start explicitly: mounted, shut, yaw 0.
   The mount is part of the start too: the machine is only on its feet at 180°, and the
   harness drives machine and lid alone, so the mount has to be stated here. */
const DATA = { turn: { ...out.data, values: { mount: MOUNT, machine: 0, lid: 0 } }, hinge: OPEN, startOpen: false };
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

/* The kit is MIT — Copyright © 2026 Ryan — and its engine is inlined into this page, so the
   notice has to travel with it. Read from the kit's own LICENSE file so the two cannot drift,
   and put the whole notice at the top of the built page as an HTML comment: the licence is
   satisfied by the page itself, not by anything outside it. */
const LICENSE_COMMENT = `<!--\n${readFileSync(join(SKILL, "LICENSE"), "utf8").trim()}\n-->`;

/* This repo's own notice, beside the kit's above. The two cover different work: the kit's engine
   is Ryan's, the laptop's dimensions, parts and controls are mine. Added as a comment after the
   doctype so that it travels with the page exactly as the kit's notice does. */
const OWN_COMMENT = `<!--\nA laptop on a turn table — the laptop's dimensions, parts and controls.\nCopyright (c) 2026 Chen Bin. MIT.\nDrawing engine: the Anatomy kit, Copyright (c) 2026 Ryan; its notice is the comment above.\n-->`;

const body = k.plateHtml({
  // Portfolio framing: no figure numbering, and the prose trimmed to what a visitor needs.
  fig: "Interactive",
  title: "A laptop on a turn table",
  // Kept short on purpose: the kit sets the hint and the readout on the same bottom line, and
  // the long version ran 566 px of hint into 136 px of readout inside a 612 px box.
  hint: "Click to open the lid · drag to turn it · arrow keys · R resets",
  readout: "lid shut 0° · yaw 0.0°",
  keys: [
    { mark: "raised", label: "The hinge barrel: it turns with the machine, not with the lid" },
    { mark: "lit", label: "The platter's index: the turn is read against it" },
  ],
  caption:
    "The case sits on the platter at z = 0, its lid hinged along x at the back and opening 100°; the machine turns about the z axis through the origin, and the platter's graduated rim reads how far it has come round. Every part is drawn from one axonometric projection, and each frame's painter order is solved from separating planes.",
  // The stage's own styling comes from the kit; the rules below are the page's.
  //  1. A press-and-move over the machine selects its label text, and dragging a selection
  //     makes Chrome start a native drag whose pointercancel kills the turn after one step.
  //     Text inside a control has no business being selectable.
  //  2. The kit's narrow-width rule moves the hint up but leaves it nowrap, so at phone widths
  //     this hint ran 212 px past the page edge. It may wrap: it lives in the plate's bottom
  //     padding, above the readout, so wrapping costs nothing — and reserving the readout's
  //     width on wider plates means the two can never run into each other. At phone widths the
  //     readout drops to its own line, so the hint takes the full width instead (2 lines, not 3).
  body: `<style>${out.css}
.lp-stage svg { user-select: none; -webkit-user-select: none; }
.lp-credit { margin: 16px 0 0; text-align: center; font: 11px/1.5 ui-sans-serif, system-ui, sans-serif; color: var(--anatomy-muted); }
.iso-plate-corner[data-corner="hint"] { white-space: normal; max-width: calc(100% - 158px); }
@media (max-width: 560px) { .iso-plate-corner[data-corner="hint"] { max-width: 100%; } }
</style>${stage}
<p class="lp-credit">Drawing engine: the Anatomy kit (MIT, © 2026 Ryan).</p>`,
});
const page = k
  .pageHtml({
    title: "A laptop on a turn table — an interactive isometric figure",
    theme,
    body,
    script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE,
    width: 700,
  })
  // The notice goes in the page itself, right under the doctype, so the file satisfies the
  // kit's licence wherever it is copied to.
  .replace(/<!doctype[^>]*>/i, (doctype) => `${doctype}\n${LICENSE_COMMENT}\n${OWN_COMMENT}`);
if (!page.includes("Permission is hereby granted")) throw new Error("the kit's licence notice did not reach the built page");
if (!page.includes("Copyright (c) 2026 Chen Bin")) throw new Error("this repo's own copyright notice did not reach the built page");
mkdirSync(join(ROOT, "dist"), { recursive: true });
{
  const name = `laptop-${theme}${verify ? "-verify" : ""}.html`;
  writeFileSync(join(ROOT, "dist", name), page);
  const tight = out.report.tight ?? [];
  console.log(
    `wrote dist/${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ` +
      `${out.report.layers.map((l) => `${l.name} ${l.parts}`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s · ` +
      (tight.length ? `${tight.length} CLEARANCE PROBLEM(S)` : "clearances ok"),
  );
}

export { out };
