/* The laptop's controls: click to swing the lid, drag in a circle to turn the machine.
   Mirrors the harness the kit's own example uses (examples/turning-dial/live.js). */
const DATA = __DATA__;
const follow = null;
const stage = document.querySelector(".lp-stage");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const OPEN = DATA.hinge; // -100: the lid's travel, in degrees
const HINT = 6; // px of wander allowed before a press counts as a drag
const TOUR = 13; // s, the tour's loop
const TOUR_ON = false; // the demo tour stays off: the machine sits shut until you click it

let yaw = 0;
let yawTarget = 0;
let lid = 0;
let open = DATA.startOpen === true;
let frame = 0;
let last = 0;
let visible = false;
let touring = TOUR_ON && !still.matches;
let idle = 0;
let clock = 0;
let drawn = null;
let own = false;
let drag = null;

const round = () => ((yaw % 360) + 360) % 360;
let spoken = "";
const describe = () => {
  const text = `laptop ${open ? "open" : "shut"}, turned ${Math.round(round())} degrees`;
  if (text === spoken) return;
  spoken = text;
  stage.setAttribute("aria-valuenow", String(Math.round(round())));
  stage.setAttribute("aria-valuetext", text);
};
const show = () => {
  const text = `lid ${open ? "open" : "shut"} ${Math.abs(Math.round(lid))}° · yaw ${round().toFixed(1)}°`;
  if (readout && readout.textContent !== text) readout.textContent = text;
};
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => {
    touring = TOUR_ON && !still.matches;
    run();
  }, 4200);
};
/* the tour: shut, open, turn a quarter, hold, turn back, shut. It only ever writes
   the two targets, so a click or a drag takes over from wherever it has got to. */
const tourAt = (t) => {
  const p = t % TOUR;
  return {
    open: p > 0.9 && p < TOUR - 2.1,
    yaw: p < 3 ? 0 : p < 5.6 ? 78 * ((p - 3) / 2.6) : p < 8.6 ? 78 : p < 11 ? 78 * (1 - (p - 8.6) / 2.4) : 0,
  };
};

const controller = TURN.mount(stage, DATA.turn, {
  follow,
  onHold: () => {
    touring = false;
    clearTimeout(idle);
  },
  onFrame: (turned) => {
    if (!own) {
      yaw = yawTarget = turned.values.machine ?? yaw;
      lid = turned.values.lid ?? lid;
      open = lid < OPEN / 2;
      drawn = { yaw, lid };
    }
    show();
  },
});
const draw = () => {
  own = true;
  controller.set({ machine: yaw, lid });
  own = false;
  drawn = { yaw, lid };
};
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (calm) {
    touring = false;
    clearTimeout(idle);
  }
  if (touring) {
    clock += dt;
    const script = tourAt(clock);
    open = script.open;
    yawTarget = script.yaw;
  }
  const lidWanted = open ? OPEN : 0;
  lid = calm ? lidWanted : lid + (lidWanted - lid) * (1 - Math.exp(-dt / 0.2));
  if (Math.abs(lidWanted - lid) < 1e-3) lid = lidWanted;
  yaw = calm ? yawTarget : yaw + (yawTarget - yaw) * (1 - Math.exp(-dt / 0.12));
  if (Math.abs(yawTarget - yaw) < 1e-3) yaw = yawTarget;
  if (drawn === null || Math.abs(yaw - drawn.yaw) > 1e-5 || Math.abs(lid - drawn.lid) > 1e-5) draw();
  show();
  describe();
  const settled = !touring && yaw === yawTarget && lid === lidWanted;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  },
  { rootMargin: "120px 0px" },
).observe(stage);

/* Belt and braces with the page's own `user-select: none`: if a native drag ever does start
   here — a selection, an image, a browser that behaves differently — refuse it. A dragstart
   that gets through fires pointercancel, and the machine stops following the hand after one
   step, which is exactly the bug this guards. */
stage.addEventListener("dragstart", (event) => event.preventDefault());

stage.addEventListener("pointerdown", (event) => {
  if (event.button) return;
  hold();
  drag = { from: controller.angleAt(event.clientX, event.clientY, 0, "machine"), base: yaw, id: event.pointerId, x: event.clientX, y: event.clientY, gap: 0, captured: false };
});
stage.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  hold();
  drag.gap = Math.max(drag.gap, Math.hypot(event.clientX - drag.x, event.clientY - drag.y));
  // The pointer's own angle about the machine's axis: the machine follows the hand. The
  // camera is in front of the machine, so the ground's own sense of turn is the screen's
  // sense, and an anticlockwise drag (rightwards along the bottom of the circle) turns the
  // machine anticlockwise as seen from up the z arrow. verify3.mjs measures this in
  // headless Chrome - re-run that check before changing the sign.
  const delta = controller.angleAt(event.clientX, event.clientY, 0, "machine") - drag.from;
  if (!drag.captured && drag.gap > HINT && Math.abs(delta) > 0.5) {
    drag.captured = true;
    stage.setPointerCapture(event.pointerId);
    stage.setAttribute("data-drag", "");
  }
  if (!drag.captured) return;
  yawTarget = drag.base + delta;
  describe();
  run();
});
const release = (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const press = !drag.captured && drag.gap <= HINT;
  drag = null;
  stage.removeAttribute("data-drag");
  try {
    stage.releasePointerCapture(event.pointerId);
  } catch {}
  if (press) {
    open = !open;
    round();
    describe();
    run();
  }
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "Enter" || key === " " || key === "Spacebar") {
    event.preventDefault();
    hold();
    open = !open;
    describe();
    run();
    return;
  }
  if (key === "r" || key === "R") {
    event.preventDefault();
    hold();
    open = false;
    yawTarget = 0;
    describe();
    run();
    return;
  }
  const step = event.shiftKey ? 30 : 5;
  let next = null;
  if (key === "ArrowRight") next = yawTarget - step; // clockwise, seen from up the z axis
  if (key === "ArrowLeft") next = yawTarget + step;
  if (next === null) return;
  event.preventDefault();
  hold();
  yawTarget = next;
  describe();
  run();
});
if (still.matches) touring = false;
draw();
describe();
show();
run();
