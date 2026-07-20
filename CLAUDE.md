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
- **Safe areas** — the HUD padding uses `env(safe-area-inset-*)` and the viewport
  is `viewport-fit=cover`, so the score/best/mute row never sits under a notch or
  camera cutout on native.

## Regenerating native icons & splash

Source art is `resources/icon.png`. The Android icon/splash PNGs in
`android/app/src/main/res/**` were rendered from it. To regenerate them with the
official tool (needs network access for its image library):

```
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d1b2a' \
  --splashBackgroundColor '#0d1b2a' --splashBackgroundColorDark '#0d1b2a'
```

See BUILDING.md for the full Android and iOS build walkthrough.
