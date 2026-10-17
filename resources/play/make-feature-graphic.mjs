// Renders the Google Play feature graphic (1024x500) from the game's own canvas.
//
// Nothing here redraws the art by hand: it loads www/index.html, poses a scene in the
// game's own globals — dusk theme, lanterns, a frog mid-swing with the tongue taut and
// a motion trail — and calls the game's render(). The result is screenshotted, cropped
// to 2.048:1 and scaled to 1024x500, then the title is drawn on top at final size so
// the type stays crisp instead of being scaled up from the game frame.
//
// Usage: node resources/play/make-feature-graphic.mjs [--open]
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
// node make-feature-graphic.mjs [themeIndex] [outFile] — defaults below produce the
// shipped banner; the args exist so alternates can be rendered side by side.
const THEME = Number(process.argv[2] ?? 4);
const OUT = path.resolve(process.argv[3] ?? path.join(HERE, 'feature-graphic.png'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

// The game's own scene, posed. Everything below is state the game already has.
const SCENE = `
window.__FG = (themeIdx, trailId) => {
  theme = buildTheme(themeIdx, 777);
  mode = 'endless'; dead = false; won = false; launched = true;
  equipped.skin = 'classic'; equipped.trail = trailId;
  camX = 0; camShake = 0; timeScale = 1;
  particles = []; texts = []; ripples = []; reeds = [];

  // lanterns: the one being swung from, plus two receding for depth. Their x/y are
  // chosen against the crop window below so none of them sits under the title.
  const mk = (x, y) => ({ x, y, _ry: y, bob: 0, glow: 1.1 });
  anchors = [ mk(320, 300), mk(700, 292), mk(1070, 505) ];

  flies = [ { x: 250, y: 585, t: 0.6, eaten: false }, { x: 330, y: 610, t: 2.1, eaten: false } ];

  // frog mid-swing: below and ahead of its lantern, moving up and to the right
  const a = anchors[0];
  frog = { x: 470, y: 560, vx: 780, vy: -290, r: 20, squash: 0.18, blink: 0 };
  attached = a;
  ropeLen = Math.hypot(frog.x - a.x, frog.y - a._ry);
  tongueT = 1; holding = true; hasTap = false;

  // motion trail: sample the arc the frog just swung through
  trail = [];
  const a0 = Math.atan2(frog.y - a._ry, frog.x - a.x);
  for (let i = 13; i >= 1; i--) {
    const ang = a0 - i * 0.055;
    trail.push({ x: a.x + Math.cos(ang) * ropeLen, y: a._ry + Math.sin(ang) * ropeLen });
  }
  // started must stay true: render() gates the tongue, the trail and the frog itself
  // on it, not just the HUD. The distance/score readout it also draws sits at y~42,
  // far above the crop window below, so it never reaches the banner.
  started = true;
  render(1400);
};
`;

// The game is one big IIFE, so `frog`, `anchors`, `render` and friends are closure
// locals, not globals — a <script> appended to the page cannot see them. Serve a copy
// with the scene helper spliced in just before the closure ends.
const GAME = fs.readFileSync(path.join(REPO, 'www/index.html'), 'utf8')
  .replace(/}\)\(\);\s*<\/script>/, SCENE + '})();\n</script>');

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(GAME);
  }
  const f = path.join(REPO, 'www', p);
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
// the game's loop would keep animating between calls; freeze it and render on demand
await ctx.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await ctx.route('https://svvtxxonagahxgftvnwx.supabase.co/**', r =>
  r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: '[]' }));

const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE);

// THEME 4 = First Light (dusk: indigo -> plum -> amber). trail 'fire' reads warm
// against it without disappearing into the horizon.
// ---- pose, render, and compose the banner, all inside the page ----
const composed = await page.evaluate(async T => {
  window.__FG(T, 'fire');
  // Read the canvas pixels, NOT a page screenshot: the menu is a DOM overlay sitting on
  // top of the canvas, and an element screenshot would bake the buttons into the art.
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const img = await load(document.getElementById('game').toDataURL('image/png'));

  const W = 1024, H = 500;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // Crop an explicit window of the game's 1280x720 world, picked so the frog lands at
  // ~30% across, the lantern it hangs from is top-left, and the waterline sits just
  // above the bottom edge. The canvas is rendered at 2x, hence the doubling.
  const WORLD_X = 200, WORLD_Y = 247, WORLD_W = 900, WORLD_H = 439;
  const px = img.width / 1280;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, WORLD_X * px, WORLD_Y * px, WORLD_W * px, WORLD_H * px, 0, 0, W, H);

  // darken the right half so the title has something quiet to sit on
  const veil = g.createLinearGradient(W * 0.30, 0, W, 0);
  veil.addColorStop(0, 'rgba(8,6,20,0)');
  veil.addColorStop(0.55, 'rgba(8,6,20,.46)');
  veil.addColorStop(1, 'rgba(8,6,20,.72)');
  g.fillStyle = veil; g.fillRect(0, 0, W, H);

  const cx = 700;                                   // inside the safe area either way
  g.textAlign = 'center';
  g.font = "bold 84px 'Trebuchet MS', 'Segoe UI', sans-serif";
  g.lineJoin = 'round';

  const title = (txt, y) => {
    g.fillStyle = 'rgba(0,0,0,.42)';                // soft drop shadow
    g.fillText(txt, cx + 3, y + 9);
    g.fillStyle = '#2c5b1e';                        // the game's chunky underside
    g.fillText(txt, cx, y + 6);
    g.strokeStyle = '#17300f'; g.lineWidth = 3;
    g.strokeText(txt, cx, y);
    g.fillStyle = '#9be564';
    g.fillText(txt, cx, y);
  };
  title('GRAPPLE', 196);
  title('FROG', 286);

  // tagline
  g.font = "bold 27px 'Trebuchet MS', 'Segoe UI', sans-serif";
  g.fillStyle = 'rgba(0,0,0,.5)';
  g.fillText('Hold to swing.  Release to soar.', cx + 2, 345);
  g.fillStyle = '#ffe28a';
  g.fillText('Hold to swing.  Release to soar.', cx, 343);

  // daily-race line, the thing that makes it more than an endless runner
  g.font = "600 20px 'Trebuchet MS', 'Segoe UI', sans-serif";
  g.fillStyle = 'rgba(234,246,233,.78)';
  g.fillText('A new course every day — same race for everyone', cx, 384);

  return c.toDataURL('image/png');
}, THEME);

fs.writeFileSync(OUT, Buffer.from(composed.split(',')[1], 'base64'));
console.log('wrote', path.relative(REPO, OUT));
if (errs.length) console.log('page errors:', errs.join(' | '));
await browser.close();
server.close();
