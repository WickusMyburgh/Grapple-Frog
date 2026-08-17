# Grapple Frog — project layout

Grapple Frog is a single-file HTML5 canvas game, now wrapped as a
[Capacitor](https://capacitorjs.com/) app so it can ship to the web, Android,
and iOS from one codebase. There is **no build step and no framework** — the
game is plain HTML/CSS/JS in one file.

## Where things live

```
www/                     ← web asset root (the game itself)
  index.html               the entire game (canvas, logic, UI, Supabase, PWA)
  sw.js                    service worker (offline cache)
  manifest.webmanifest     PWA manifest
  icon-192.png             PWA / app icon source art
  icon-512.png
capacitor.config.json    Capacitor config (app id, name, webDir=www, splash)
resources/
  icon.png                 1:1 source art for regenerating native icons/splash
android/                 native Android project (Gradle / Android Studio)
ios/                     native iOS project — generated on macOS, not in-repo yet
.github/workflows/
  pages.yml                deploys www/ to GitHub Pages
package.json             Capacitor dependencies + tooling
BUILDING.md              step-by-step Android & iOS build guide
RELEASING.md             release checklist (merge → Pages → itch ZIP → APK)
```

The game is authored **once** in `www/index.html`. Every target loads that same
file:

- **Web / PWA / GitHub Pages** — served straight from `www/`.
- **Android / iOS** — Capacitor copies `www/` into the native app at build time
  (`npx cap copy` / `npx cap sync`), so the WebView loads the identical game.

## GitHub Pages

Because the game moved into `www/` (needed as Capacitor's `webDir`), Pages can no
longer serve it from the branch root. Instead `.github/workflows/pages.yml`
publishes the `www/` folder as the site root, so the canonical URL
`https://wickusmyburgh.github.io/Grapple-Frog/` still points straight at the game
(the in-game "Play" links depend on this).

**One-time setup:** in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**. After that, every push to `main` that touches `www/`
redeploys automatically.

## Making changes to the game

Edit `www/index.html` (and `sw.js` / manifest as needed). That's the whole game.

- Nothing needs rebuilding for the web — commit and Pages redeploys.
- For native, run `npx cap sync` afterward to copy the updated `www/` into the
  Android/iOS projects before building. Bump the service worker cache name in
  `www/sw.js` when you want returning web players to pick up changes.

## Native integrations

- **Haptics** (`@capacitor/haptics`) — the game calls a small `Haptics` helper in
  `www/index.html` (search for `const Haptics`). It fires light impact on grapple
  attach, medium on fly catch, heavy on splash, and a success notification on
  daily finish. On the web `window.Capacitor` is absent, so every call is a
  silent no-op — nothing to guard at each call site.
- **Splash screen** (`@capacitor/splash-screen`) — dark swamp background
  (`#0d1b2a`), configured in `capacitor.config.json`.
- **Text entry** (`@capacitor/dialog`, `@capacitor/keyboard`) — HTML `<input>`s are
  unusable in the WebView (focusing one resizes it and the page blanks out), so all
  three text entry points — player name, league name, league join code — go through
  the native `prompt()` on native and the HTML dialogs on the web. The switch is
  `IS_NATIVE` in `www/index.html`; the shared helper is `nativePrompt()`, which
  re-asks on invalid input and returns `null` on cancel. Backed by
  `plugins.Keyboard.resize: "none"` (iOS **only** — the plugin ignores it on
  Android) and `android:windowSoftInputMode="adjustNothing"` in the manifest.
  See BUILDING.md → *Text entry and the keyboard*.
- **Safe areas** — the HUD padding uses `env(safe-area-inset-*)` and the viewport
  is `viewport-fit=cover`, so the score/best/mute row never sits under a notch or
  camera cutout on native.

## Daily background themes

Each daily gets its own sky, picked from eight hand-authored palettes in `THEMES`
(`www/index.html`, search for `const THEMES`). A theme carries colours plus a few
structural knobs — moon (or none) with a seeded phase and position, star density,
rolling-hill vs pine silhouettes, fog band, water tint and ripple height, and
optional rain/snow. Endless picks one at random per run; the menu previews today's.

**The one rule:** the course is generated from `rand` (`mulberry32(dailyNum * 7919 +
13)`) and *every draw advances that stream*, so theme code must never call `rand()` —
a single stray call would shift every anchor and give everyone a different course.
Themes run on their own generator, `mulberry32(dailyNum * 104729 + 7)`. Likewise
nothing in a theme may move `WATER_Y()` or any other value `update()` reads: palettes,
silhouettes and particles only. `scratchpad/verify-themes.mjs` asserts both by diffing
the seeded anchors against `main`.

## The anaconda hazard

Tall reed clusters rise from the water; some hide a coiled anaconda partway up
(search `SNAKE_` in `www/index.html`). Enter its strike radius and it lunges;
contact ends the run with `deathCause = 'snake'` — its own animation, sound and
shake — while escaping a near miss pays `CLOSE CALL! +40`.

Placement comes from **`rand`**, the same seeded stream as the lanterns and flies,
so every player gets the same hazards on the same daily. Two consequences to know:

- Because it shares that stream, adding this feature **changed every daily course
  past the 150m exclusion zone**. No `rand()` is spent inside the zone, so the
  opening stretch of each daily is byte-identical to before, and the divergence
  starts where hazards can first appear.
- `snakeSafeAt()` is what keeps a hazard fair, and it is not optional: no snake may
  sit within `SNAKE_R + SNAKE_CLEAR` of a lantern in rope range, its strike zone must
  stay below `WATER_Y() - SNAKE_CEIL` so there is always clear air to fly over, and it
  may never sit on a fly. `scratchpad/verify-snake.mjs` re-checks all three across a
  ~2400m survey.

`gameOver(cause)` defaults to `'splash'`, so existing call sites are unchanged, and
everything after the death sequence — scoring, banking, `lastRun`,
`recordDailyAttempt()`, `track()` — runs identically either way. Leaderboard writes
do not know or care how the frog died.

## Regenerating native icons & splash

Source art is `resources/icon.png`. The Android icon/splash PNGs in
`android/app/src/main/res/**` were rendered from it. To regenerate them with the
official tool (needs network access for its image library):

```
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d1b2a' \
  --splashBackgroundColor '#0d1b2a' --splashBackgroundColorDark '#0d1b2a'
```

> **Careful — that tool will re-break the splash.** It writes full-screen
> `drawable-port-*/splash.png` and `drawable-land-*/splash.png` bitmaps. The launch
> theme applies `@drawable/splash` as `android:background`, and a window background
> that is a plain bitmap is **stretched to the window bounds with no regard for
> aspect ratio** — in locked landscape Android picked the portrait asset and squashed
> the frog flat. The splash is now `drawable/splash.xml`, a layer-list of a colour
> layer plus `@drawable/splash_icon` (a square 200dp frog, one per density bucket)
> drawn `android:gravity="center"` at its intrinsic size, so it cannot be distorted.
> If you run the generator, delete the `splash.png` files it creates and restore
> `drawable/splash.xml`. `androidScaleType` must stay `CENTER` for the same reason —
> the plugin's own splash draws the same drawable, and `CENTER_CROP`/`FIT_XY` would
> rescale it mid-launch.

See BUILDING.md for the full Android and iOS build walkthrough.
