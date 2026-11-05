// embed-check.mjs — does the artifact render and stay interactive inside an <iframe>?
// A file:// parent has an opaque origin, so its frame's document is unreadable from JS. So this
// checks the two things a visitor's eye would: the frame's pixels are not blank, and a drag
// inside the frame changes them (i.e. the machine turned).
// usage: node embed-check.mjs <url-of-the-embedding-page>
const URL_ = process.argv[2];
const CDP = "http://127.0.0.1:9222";
const list = await (await fetch(CDP + "/json/list")).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0, loaded = false; const waiting = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(JSON.stringify(m.error))) : w.res(m.result); }
  if (m.method === "Page.loadEventFired") loaded = true;
};
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; waiting.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return "EXCEPTION: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
const shot = async (clip) => (await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })).data;

// Decode a PNG back in the page and describe it: a blank region is one flat colour.
const STATS = (b64) => `new Promise((res) => { const i = new Image(); i.onload = () => {
  const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
  const x = c.getContext('2d'); x.drawImage(i, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; const seen = new Set(); let ink = 0;
  for (let p = 0; p < d.length; p += 4) { const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2]; seen.add(k);
    if (Math.abs(d[p] - 11) > 8 || Math.abs(d[p + 1] - 11) > 8 || Math.abs(d[p + 2] - 11) > 8) ink++; }
  res({ w: i.width, h: i.height, colours: seen.size, inkPct: +(100 * ink / (d.length / 4)).toFixed(1) }); };
  i.src = 'data:image/png;base64,${b64}'; })`;

// And compare two of them: how much of the frame moved?
const DIFF = (a, b) => `Promise.all([${a}, ${b}].map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })))
  .then(([ia, ib]) => { const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const x = c.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let p = 0; p < da.length; p += 4) if (Math.abs(da[p] - db[p]) > 12 || Math.abs(da[p + 1] - db[p + 1]) > 12) n++;
    return { changedPct: +(100 * n / (da.length / 4)).toFixed(1) }; })`;

const frames = (t, acc = []) => { acc.push({ url: t.frame.url.split("/").pop(), parent: t.frame.parentId ? "frame" : "(top)" }); (t.childFrames || []).forEach((c) => frames(c, acc)); return acc; };

await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 800, deviceScaleFactor: 1, mobile: false });
loaded = false;
await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 80 && !loaded; i++) await sleep(100);
await sleep(2500);

const out = { page: URL_.split("/").pop(), frames: frames((await send("Page.getFrameTree")).frameTree) };
const box = await ev(`(() => { const f = document.querySelector('iframe'); const r = f.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
out.iframe = box;
const a = await shot(box);
out.framePixels = await ev(STATS(a));
// control: the same interval with no input at all. At rest this page is genuinely still, so
// anything the drag moves has to show up against a zero baseline.
await sleep(600);
out.controlPixels = await ev(STATS(await shot(box)));
out.controlDrift = await ev(DIFF(JSON.stringify(a), JSON.stringify(await shot(box))));
// drag a circle in the middle of the frame — where the stage sits
const cx = box.x + Math.round(box.width / 2), cy = box.y + 250;
const path = [[cx - 60, cy], [cx - 30, cy - 25], [cx + 30, cy - 25], [cx + 60, cy]];
await mouse("mousePressed", path[0][0], path[0][1]);
for (const [x, y] of path.slice(1)) { await mouse("mouseMoved", x, y); await sleep(80); }
await mouse("mouseReleased", path[path.length - 1][0], path[path.length - 1][1]);
await sleep(600);
const b = await shot(box);
out.afterDragPixels = await ev(STATS(b));
out.dragEffect = await ev(DIFF(JSON.stringify(a), JSON.stringify(b)));
out.verdict = {
  frameLoaded: out.frames.some((f) => f.url.includes("laptop")),
  frameRendered: out.framePixels.colours > 20 && out.framePixels.inkPct > 1,
  frameRespondedToDrag: out.dragEffect.changedPct > 0.5,
};
await send("Emulation.clearDeviceMetricsOverride");
console.log(JSON.stringify(out, null, 1));
ws.close();
process.exit(0);
