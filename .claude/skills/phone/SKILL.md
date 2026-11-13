---
name: phone
description: Debug or record the site on the user's Android phone, iPhone or an emulator, driven over the Chrome DevTools Protocol.
disable-model-invocation: true
---

# Phone

The screen is the truth. A phone's browser can move pixels without the DOM noticing, so a verdict comes from a device screenshot. Desktop DevTools device mode and Playwright mobile emulation have no software keyboard and never shrink the visual viewport: they cannot decide a keyboard, viewport or touch question.

Two drivers, one per platform, with no npm dependency (Node 22+, `ffmpeg`):

- `scripts/android.mjs` drives Chrome over `adb`: `connect`, `devices`, `awake`, `pages`, `open`, `tap`, `eval`, `frames`, `shot`, `record`, `sheet`, `adb <args>`, `clean`. Set `ANDROID_SERIAL` when more than one device is attached.
- `scripts/iphone.mjs` drives Safari through `pymobiledevice3` and WebDriverAgent: `connect`, `pages`, `open`, `tap`, `swipe`, `eval`, `size`, `shot`, `record`, `sheet`, `clean`.

Setup, pitfalls and sources: [REFERENCE.md](REFERENCE.md).

## 1. Get the phone ready

When the user has not named the phone, ask: Android or iPhone. Then send its list below as written, in one message, and wait for the answer its last line asks for.

**Android**

1. Ouvre **Réglages › Système › Options pour les développeurs** et active **Rester activé**.
2. Touche le texte **Débogage sans fil**, pas l'interrupteur, et active-le.
3. Envoie-moi le port de la ligne **Adresses d'appareil et port** : le nombre après les deux-points.

**iPhone**

1. Branche l'iPhone au Mac avec le câble et déverrouille-le. Touche **Se fier** s'il le demande.
2. Ouvre **Réglages › Luminosité et affichage › Verrouillage automatique** et choisis **Jamais**.
3. Ouvre **Réglages › Apps › Safari › Avancé** et active **Inspecteur web** et **Automatisation à distance**.
4. Réponds « prêt ».

Then connect: `android.mjs connect <port>`, or `iphone.mjs connect`. The first iPhone run builds WebDriverAgent, a few minutes ([REFERENCE.md › iPhone](REFERENCE.md#iphone)). The emulator suits a loop that runs alone ([REFERENCE.md › Emulator](REFERENCE.md#emulator)).

Done when `android.mjs awake` prints `"wakefulness":"Awake"` and `"locked":false`, or `iphone.mjs connect` prints `connected`.

## 2. Open the page in your own tab

Production by its URL. A local server is the user's to start; once it runs:

- **Android**: `android.mjs adb reverse tcp:<port> tcp:<port>`, then `http://localhost:<port>`.
- **iPhone**: `tailscale serve --bg --https=<free port> http://localhost:<port>`, then `https://<the Mac's tailnet name>:<free port>`. Vite answers that host only when started with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<the Mac's tailnet name>`.

Add a query string only your runs use, then `open <url>`. The user's other tabs stay untouched. An in-app navigation drops the query string: address the tab by its path afterwards.

## 3a. Debug

1. Act like a finger. `tap <url-part> <css-selector>` sends a real touch, so focusing an input opens the keyboard. A swipe is `android.mjs adb shell input swipe x1 y1 x2 y2 <ms>`, or `iphone.mjs swipe <fromY> <toY> <ms> [holdMs]` in points.
2. Read the page every frame with `android.mjs frames <url-part> <ms>`, right after the touch, or sample it with `eval`.
3. Read the screen with `shot <png>`, or `record <seconds> <mp4>` and `sheet <mp4> <png>`. Look at every image. When the screen moves and the frames stay still, the browser moved the view natively.
4. A timing bug gets five runs or more, reported as a rate. A bug seen on one phone gets the same runs on the other.
5. Bisect against a control page without the suspect code, adding the app's ingredients one at a time. The fix is proven when it stays green on every run where the bug went red.
6. Before blaming a library, search its GitHub issues. An upstream report carries a minimal repro, the device, the browser build and the media: `gh … --attach` uploads to a repository with push access, and the `user-attachments` URL works in any issue.

Done when one command shows the user's exact symptom on a screenshot, then shows it gone after the fix.

## 3b. Capture

Script the take with `open`, `tap`, `swipe` and `eval`, then `record <seconds> <mp4>`. Wrap the action between a pause before and after, so the clip can be trimmed. Encode for the web with `ffmpeg` (H.264 `yuv420p` with `+faststart` for `<video>`, or WebM), trim with `-ss`/`-t`, and crop the status bar with `crop` when it should not show.

Done when the user has seen the clip and its contact sheet.

## 4. Clean up

`clean` stops what the driver started. Turn off any `tailscale serve` port you opened (`tailscale serve --https=<port> off`) and stop the local servers you started. Then remind the user: on Android, turn off **Débogage sans fil** and **Rester activé**; on the iPhone, set **Verrouillage automatique** back and unplug the cable.
