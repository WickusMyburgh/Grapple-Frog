# Google Play store assets

## `feature-graphic.png` — 1024 × 500

The banner Play shows at the top of the store listing. Rendered from the game's own
canvas rather than drawn by hand: `make-feature-graphic.mjs` loads `www/index.html`,
poses a scene in the game's own state (dusk theme, lanterns, the frog mid-swing with
the tongue taut and a motion trail) and calls the game's `render()`. So the art can
never drift from the game — re-run it after any change to the frog, lanterns or themes
and the banner follows.

### Regenerating

Needs a headless Chromium. From the repo root:

```bash
npm i --no-save playwright-core
node resources/play/make-feature-graphic.mjs
```

On this machine Chromium lives at `/opt/pw-browsers/chromium`; elsewhere, point
`executablePath` at your own, or install Playwright's (`npx playwright install
chromium`).

### Trying a different sky

The second argument is a theme index into `THEMES` in `www/index.html`, the third an
output path:

```bash
node resources/play/make-feature-graphic.mjs 1 /tmp/blood-moon.png
```

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Swamp Night | Blood Moon | Aurora | Deep Fog | **First Light** | Storm | Frostfall | Witchlight |

**First Light (4)** is the shipped one — it is the dusk palette, indigo through plum to
an amber horizon. Blood Moon and Witchlight give the green wordmark the most contrast
if you ever want something louder.

### Things that are deliberate

- **The crop is an explicit window of the game's 1280×720 world**, not a fraction. It is
  set so the frog lands ~30% across, the lantern it hangs from is top-left, and the
  waterline sits just above the bottom edge. Changing the scene coordinates means
  re-checking that window.
- **`started` stays `true`** while rendering. It gates the tongue, the trail and the frog
  itself — not just the HUD. The distance/score readout it also draws sits at y≈42, far
  above the crop window, so it never reaches the banner.
- **The canvas is read with `toDataURL()`, not screenshotted.** The menu is a DOM overlay
  sitting on top of the canvas; an element screenshot bakes the buttons into the art.
- **The wordmark is drawn at final size**, after the scaled-down game frame, so the type
  stays crisp rather than being enlarged along with the art.
- **Keep key content ~10% in from each edge.** Play crops and overlays at the edges on
  some surfaces. `scratchpad/verify-feature.mjs` checks the wordmark's bounding box
  against that band, along with the exact dimensions and full opacity.

### Play's requirements, for reference

1024 × 500, PNG or JPEG, up to 15 MB, no transparency, and no Google Play branding or
device frames in the image.
