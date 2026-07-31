# Building Grapple Frog for Android & iOS

This is a step-by-step guide for turning the game into installable Android and
iOS apps. It assumes **no prior mobile-dev experience** — just follow along.

The game itself is `www/index.html`. Capacitor wraps that web app in a native
shell for each platform. You edit the game once; both platforms load the same
files.

---

## 0. One-time setup (do this first)

You need [Node.js](https://nodejs.org/) (v18 or newer). Check with:

```bash
node --version
```

Then, from the project folder, install the tooling:

```bash
npm install
```

This downloads Capacitor and the plugins into `node_modules/` (not committed).

Whenever you change the game in `www/`, copy it into the native projects with:

```bash
npx cap sync
```

> `cap sync` = copy `www/` into Android/iOS **and** update native plugins. Run it
> before every native build so the app has your latest game code.

---

## 1. Android build (Android Studio route)

### Install the tools
1. Download and install **[Android Studio](https://developer.android.com/studio)**.
2. On first launch it offers to install the **Android SDK** — accept the defaults.

### Open the project
The `android/` folder is already in this repo. Open it in Android Studio:

```bash
npx cap open android
```

(or just open the `android/` folder from Android Studio's "Open" dialog).

Let Android Studio finish "Gradle sync" the first time — it downloads build
dependencies and can take a few minutes.

### Run it on a phone or emulator
- **Emulator:** in Android Studio, open **Device Manager** → **Create Device**,
  pick a phone, download a system image, and start it. Then press the green
  **▶ Run** button.
- **Real phone:** enable **Developer Options → USB debugging** on the phone, plug
  it in, pick it in the device dropdown, and press **▶ Run**.

### Make a shareable APK
**Build → Build Bundle(s) / APK(s) → Build APK(s)**. When it finishes, click
**locate** to find `app-debug.apk`. That file installs on any Android phone
(the phone must allow "install from unknown sources").

For a Play Store upload you'd instead do **Build → Generate Signed Bundle / APK**
and follow the wizard to create a signing key — that's only needed when you're
ready to publish.

---

## 2. iOS build (Xcode route)

> iOS builds **must** be done on a **Mac** with **Xcode** — Apple's tools don't
> run on Windows/Linux. The `ios/` folder isn't in the repo yet because it can
> only be generated on a Mac.

### Install the tools
1. Install **[Xcode](https://apps.apple.com/app/xcode/id497799835)** from the Mac
   App Store.
2. Install **CocoaPods** (a dependency manager Capacitor uses):
   ```bash
   sudo gem install cocoapods
   ```

### Generate the iOS project (first time only)
From the project folder on your Mac:

```bash
npm install
npx cap add ios
npx cap sync ios
```

This creates the `ios/` folder using the app name and bundle ID from
`capacitor.config.json`, and generates the app icons/splash. You can commit the
`ios/` folder afterward, just like `android/`.

> To use the frog app icons on iOS, run the asset generator once:
> `npm i -D @capacitor/assets && npx capacitor-assets generate --ios`
> (needs internet access). Otherwise set them in Xcode → `Assets.xcassets`.

### Open and run
```bash
npx cap open ios
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** tab → pick your **Team**
   (a free Apple ID works for running on your own device).
2. Pick a simulator or your plugged-in iPhone in the top device dropdown.
3. Press the **▶ Run** button.

### Lock to landscape on iOS
The game draws to a fixed **1280×720 landscape** canvas, so every platform is
locked to landscape (see [Orientation](#orientation) below).

Android is already handled. On iOS, in Xcode select the **App** target →
**General** tab → **Deployment Info** → under **Device Orientation** tick
**only** *Landscape Left* and *Landscape Right* (untick both Portrait boxes).

---

## 3. Changing the bundle ID (app identifier)

The bundle ID (e.g. `com.wickusmyburgh.grapplefrog`) uniquely identifies your app
in the stores. Pick a reverse-domain name you control before publishing.

**Easiest — change it before generating platforms:** edit `appId` in
**`capacitor.config.json`**, then run `npx cap sync`. New platforms pick it up
automatically.

**If the platform already exists, change it in the native files too:**

- **Android** — `android/app/build.gradle`:
  - line with `applicationId "…"`  (what users install)
  - line with `namespace = "…"`     (keep it matching)
  Then **Build → Clean Project** and rebuild.
- **iOS** — Xcode → **App** target → **Signing & Capabilities** →
  **Bundle Identifier** field.

---

## 4. Changing the version number

Bump these each time you release an update.

- **Android** — `android/app/build.gradle`:
  - `versionName "1.0"` — the human-facing version shown to users (e.g. `"1.1"`).
  - `versionCode 1` — an internal integer that must **increase** by at least 1 for
    every Play Store upload (e.g. `2`, `3`, …).
- **iOS** — Xcode → **App** target → **General** tab:
  - **Version** — the user-facing version (e.g. `1.1`).
  - **Build** — an internal build number that must increase for each upload.

The app name ("Grapple Frog") lives in:
- Android — `android/app/src/main/res/values/strings.xml` (`app_name`).
- iOS — Xcode → **App** target → **General** → **Display Name**.
- Both are seeded from `appName` in `capacitor.config.json` at generation time.

---

## 5. Orientation

The game renders to a **fixed 1280×720 landscape canvas**, so it is locked to
landscape everywhere. If you ever need to change that, these are all the places
orientation is set:

| Platform | Where | Value |
|----------|-------|-------|
| **Android** | `android/app/src/main/AndroidManifest.xml` → `<activity android:name=".MainActivity">` | `android:screenOrientation="sensorLandscape"` |
| **iOS** | Xcode → **App** target → **General** → **Deployment Info** → Device Orientation | Landscape Left + Landscape Right only |
| **PWA / web install** | `www/manifest.webmanifest` | `"orientation": "landscape"` |
| **Browser (any)** | `www/index.html` — the `#rotate` overlay | Prompts phones held in portrait to turn sideways |

`sensorLandscape` lets the phone flip between both landscape directions but never
rotates into portrait.

> **Note:** `npx cap sync` does **not** rewrite `AndroidManifest.xml`, so this
> setting is safe across syncs (Capacitor has no orientation option in
> `capacitor.config.json`). It is only lost if you delete and regenerate the
> `android/` folder with `npx cap add android` — in that case re-apply the
> `android:screenOrientation` line above.

### Text entry and the keyboard

Typing into an HTML `<input>` inside the WebView is unusable: focusing one makes
the WebView resize for the keyboard and the page collapses to a blank white
screen, and locked landscape leaves almost nothing visible anyway. So **the app
does not use the HTML fields at all**. All three text entry points — player name,
league name, league join code — go through `@capacitor/dialog`'s native
`prompt()`, which is a real platform dialog drawn above the WebView with the OS
handling its own keyboard. The web build is unaffected and keeps the HTML
dialogs; the switch is `IS_NATIVE` in `www/index.html`.

Two settings back that up, and they are **not interchangeable**:

| | Where | Why |
|---|---|---|
| iOS | `capacitor.config.json` → `plugins.Keyboard.resize: "none"` | Stops the WebView resizing when a keyboard appears. |
| Android | `AndroidManifest.xml` → `android:windowSoftInputMode="adjustNothing"` | Same effect. **The Keyboard plugin's `resize` option is iOS-only** — its Android code reads only `resizeOnFullScreen` — so the manifest is the only lever here. |

`adjustNothing` is on the same `<activity>` as the orientation lock, so re-apply
it too if you ever regenerate `android/`.

Browsers cannot force a device to rotate, so the web build instead shows a
full-screen "Rotate your device to play" prompt when a **phone-sized** screen is
held in portrait. It clears itself as soon as the device is turned, and never
appears on desktop or wide screens.

---

## 6. Everyday workflow, in short

```bash
# edit the game
vim www/index.html

# push the change into the native apps
npx cap sync

# open the platform and press Run
npx cap open android      # or: npx cap open ios
```

That's it — the web version (GitHub Pages) updates on its own when you push to
`main`; the native apps update when you `cap sync` and rebuild.
