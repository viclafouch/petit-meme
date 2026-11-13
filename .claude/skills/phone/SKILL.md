---
name: phone
description: Drive Chrome on the user's Android phone or an emulator over adb and the Chrome DevTools Protocol, to debug a page or to capture it as screenshots and video. Use when a bug or a check concerns a phone, a tap, the software keyboard, a PWA or a Custom Tab, when the user asks to test something on their phone, or to record the site on a phone.
---

# Phone

The screen is the truth. Chrome on a phone can move pixels without the DOM noticing, so a verdict comes from a device screenshot. Desktop DevTools device mode and Playwright mobile emulation have no software keyboard and never shrink the visual viewport: they cannot decide a keyboard, viewport or touch question.

`scripts/phone.mjs` drives the device with no dependency (Node 22+, `adb`, `ffmpeg`): `connect`, `devices`, `awake`, `pages`, `open`, `tap`, `eval`, `frames`, `shot`, `record`, `sheet`, `adb <args>` (finds `adb` off the `PATH`), `clean`. Set `ANDROID_SERIAL` when more than one device is attached. Setup, pitfalls and sources: [REFERENCE.md](REFERENCE.md).

## 1. Connect

- **The user's phone** whenever the question is about what they see: same Chrome, same keyboard, same timing. It is on Tailscale and already paired: in one message, ask the user to turn on Wireless debugging and Stay awake and to send the Wireless debugging port, then `phone.mjs connect <port>` ([REFERENCE.md › Connect](REFERENCE.md#connect)).
- **The emulator** for a loop that runs alone; its Chrome lags stable ([REFERENCE.md › Emulator](REFERENCE.md#emulator)).

Done when `phone.mjs awake` prints `"wakefulness":"Awake"` and `"locked":false`.

## 2. Open the page in your own tab

Production by its URL. A local build: serve it, `phone.mjs adb reverse tcp:<port> tcp:<port>`, and use `http://localhost:<port>`. Add a query string only your runs use, then `phone.mjs open <url>`. The user's other tabs stay untouched.

## 3a. Debug

1. Act like a finger: `phone.mjs tap <url-part> <css-selector>` sends a real touch, so focusing an input opens the keyboard.
2. Read the page every frame with `phone.mjs frames <url-part> <ms>`, right after the tap.
3. Read the screen with `phone.mjs shot <png>`, or `phone.mjs record <seconds> <mp4>` and `phone.mjs sheet <mp4> <png>`. Look at every image. When the screen moves and the frames stay still, Chrome moved the view natively.
4. A timing bug gets five runs or more, reported as a rate.
5. Bisect against a control page without the suspect code, adding the app's ingredients one at a time. The fix is proven when it stays green on every run where the bug went red.
6. Before blaming a library, search its GitHub issues. An upstream report carries a minimal repro, the device, the browser build and the media: `gh … --attach` uploads to a repository with push access, and the `user-attachments` URL works in any issue.

Done when one command shows the user's exact symptom on a screenshot, then shows it gone after the fix.

## 3b. Capture

Script the take with `open`, `tap` and `eval`, then `phone.mjs record <seconds> <mp4>` at the device's native resolution. Wrap the action between a pause before and after, so the clip can be trimmed. Encode for the web with `ffmpeg` (H.264 `yuv420p` with `+faststart` for `<video>`, or WebM), trim with `-ss`/`-t`, and crop the status bar with `crop` when it should not show.

Done when the user has seen the clip and its contact sheet.

## 4. Clean up

`phone.mjs clean` removes the tunnels and the wireless connection. Stop the local servers you started, then remind the user to turn wireless debugging and Stay awake off.
