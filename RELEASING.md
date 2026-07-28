# Releasing Grapple Frog

A step-by-step checklist for shipping a new version. Work top to bottom — the web
release happens automatically, itch.io and Android are manual.

If you only changed the game and want it live on the web, **steps 1–3 are all you
need.** Steps 4–7 are for itch.io and Android.

---

## 0. Before you merge

- [ ] Play the game once on the PR preview or locally and make sure nothing is
      obviously broken.
- [ ] **Bump the service worker cache** if anything in `www/` changed. Open
      `www/sw.js` and increase the number:

      const CACHE = 'grapple-frog-v10';   ->   'grapple-frog-v11'

      This is what makes returning players (and installed PWAs) actually download
      the new version instead of serving the old one from cache. Skipping it is the
      single most common reason a release "didn't take".

---

## 1. Merge the pull request

On GitHub, open the PR and click **Merge pull request** → **Confirm merge**.

Merging into `main` is what triggers the web deploy, so nothing goes live until
this happens.

---

## 2. Pull the changes to your computer

In a terminal, in the project folder:

```bash
git checkout main
git pull
```

Everything below assumes you are on an up-to-date `main`. If you skip this, you
will build and upload an old version of the game.

---

## 3. Verify the web version (GitHub Pages)

The deploy runs by itself. To check it:

1. Go to the repo's **Actions** tab on GitHub.
2. Look at the top run of **"Deploy web game to GitHub Pages"**. Wait for the
   green tick (usually well under a minute).
3. Open **https://wickusmyburgh.github.io/Grapple-Frog/** and confirm you see the
   new version.

> **Seeing an old version?** Open it in a **private/incognito window** first. If
> the new version appears there, it's your browser's cache — the fix is the
> service-worker bump in step 0. In a normal window you can clear it with
> **F12 → Application → Service Workers → Unregister**, then
> **Application → Storage → Clear site data**, then reload.

**A gotcha:** the deploy only runs automatically when files inside `www/` change.
If your release only touched docs or the Android project, Pages won't redeploy —
that's fine, because the game itself didn't change. To force a deploy anyway, go to
**Actions → Deploy web game to GitHub Pages → Run workflow**.

---

## 4. Build the ZIP for itch.io

itch.io requires **`index.html` to sit at the very top level of the ZIP** — not
inside a folder. This is the step people get wrong most often.

You are zipping **the contents of the `www` folder**, *not* the `www` folder
itself.

```
✅ CORRECT — index.html at the root      ❌ WRONG — nested in a folder
grapple-frog-web.zip                     grapple-frog-web.zip
├── index.html                           └── www/
├── sw.js                                    ├── index.html
├── manifest.webmanifest                     ├── sw.js
├── icon-192.png                             └── ...
└── icon-512.png
```

### macOS / Linux

```bash
cd www
zip -r ../grapple-frog-web.zip .
cd ..
```

### Windows

1. Open the `www` folder.
2. Select **everything inside it** (Ctrl+A) — the files, not the `www` folder.
3. Right-click → **Send to** → **Compressed (zipped) folder**.
4. Rename it to `grapple-frog-web.zip` and move it up to the project folder.

### Check it before uploading

```bash
unzip -l grapple-frog-web.zip
```

The list must show `index.html` on its own, with **no `www/` in front of it**.

### Upload to itch.io

1. On your game's page: **Edit game** → **Uploads** → **Upload files**, pick the ZIP.
2. Tick **"This file will be played in the browser"**.
3. Under **Embed options**, set the viewport to **1280 × 720** (the game's fixed
   resolution), and turn on **Fullscreen button** and **Mobile friendly**.
4. **Save**, then play it once from the public page to confirm.

ZIP files are gitignored, so you don't need to delete it afterwards.

---

## 5. Bump the version numbers (do this *before* building the APK)

Open **`android/app/build.gradle`** and edit these two lines (around lines 10–11):

```gradle
versionCode 1
versionName "1.0"
```

- **`versionName`** — what players see, e.g. `"1.1"`. Use whatever reads sensibly.
- **`versionCode`** — a plain whole number that must **go up by at least 1 for every
  upload to the Play Store**, e.g. `2`, then `3`. The Play Store rejects an upload
  that reuses a number.

Bump both, then commit the change:

```bash
git add android/app/build.gradle
git commit -m "Bump version to 1.1"
git push
```

> On iOS the equivalents are **Version** and **Build** in Xcode → the **App**
> target → **General** tab. See BUILDING.md.

---

## 6. Copy the web build into the Android app

```bash
npx cap sync android
```

This copies `www/` into the Android project and refreshes the native plugins.
**If you skip this, the APK ships the previous version of the game** — the Android
app doesn't read `www/` directly, it uses its own copy.

---

## 7. Build the APK in Android Studio

```bash
npx cap open android
```

Then in Android Studio:

1. Wait for **Gradle sync** to finish (the progress bar at the bottom).
2. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
3. When the notification appears, click **locate** to open the folder. The file is:

   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. Install it on a phone to test (the phone must allow "install from unknown
   sources").

**For a Play Store release** use **Build** → **Generate Signed Bundle / APK**
instead, and follow the wizard. You'll need a signing key — create one once and
keep it safe, because you cannot update the app later without it.

---

## 8. After the release

- [ ] Play the live web version once (step 3).
- [ ] Play the itch.io version once.
- [ ] Install and play the APK once.
- [ ] Check the daily leaderboard still records a run (it writes to Supabase).

---

## Quick reference

| What | Where |
|---|---|
| Live web game | https://wickusmyburgh.github.io/Grapple-Frog/ |
| Web deploy status | repo → **Actions** tab |
| Service worker cache | `www/sw.js` → `const CACHE` |
| Folder to zip for itch | contents of `www/` |
| Android version numbers | `android/app/build.gradle` |
| Built APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| App name / bundle ID | `capacitor.config.json` (see BUILDING.md) |
