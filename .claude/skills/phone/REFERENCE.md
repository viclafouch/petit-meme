# Phone reference

## Android

The user reaches their phone through Tailscale: the Mac and the phone sit on the same tailnet, which works across networks and Wi-Fi client isolation. The phone is already paired with this Mac.

1. The user sends the port shown on the Wireless debugging screen. It changes each time wireless debugging restarts, and opening the pairing dialog restarts it.
2. `android.mjs connect <port>` finds the online Android device on the tailnet and runs `adb connect`. A previous port can stay listed as `offline` beside it: `android.mjs adb disconnect <ip>:<old-port>`, or set `ANDROID_SERIAL`.

When `adb connect` answers that the device is not paired (new Mac, revoked authorisations): ask the user to open **Associer l'appareil avec un code d'association** and to send the pairing port, the number after the colon in that dialog. Take the six-digit code through `request_secret` with `delivery: "file"`, and run `android.mjs adb pair <tailscale-ip>:<pairing-port> "$(cat <file>)"` while the dialog stays open.

When the phone is missing from `tailscale status`: the Tailscale app on the phone is off or signed out.

`adb` comes with the Android SDK at `~/Library/Android/sdk/platform-tools`, or `brew install --cask android-platform-tools`.

## iPhone

Apple lets a Mac drive an iPhone only through its developer services, so the iPhone driver joins three tools:

- **Safari's Web Inspector, bridged to CDP** by `pymobiledevice3 webinspector cdp --native` on `127.0.0.1:9222`: `pages`, `open`, `eval`, and the CSS position behind `tap`.
- **WebDriverAgent**, an XCUITest app on the iPhone, for real touches (`tap`, `swipe`), `shot`, and an MJPEG stream for `record`. `connect` turns its idle waits off, or fast swipes queue behind them.
- **The CoreDevice tunnel** that macOS opens over the cable. WebDriverAgent answers on the tunnel's address, read with `xcrun devicectl device info details`.

One-time setup on the Mac: `uv tool install pymobiledevice3`, and Xcode signed in to an Apple Developer account, whose Apple Development certificate names the signing team. The first `connect` clones WebDriverAgent from the `appium/appium-ios` monorepo into `~/.cache/phone-skill`, then signs and builds it for the plugged-in iPhone; later runs reuse the build.

Limits on iOS 26:

- `record` reads WebDriverAgent's MJPEG stream at about 35 frames per second: a blank screen that lasts shows, a flash of one or two frames shows about half the time.
- `pymobiledevice3` mirrors the screen and injects touches without an app from iOS 27, and Xcode 27's `devicectl device capture screenshot` takes screenshots: weigh them once the iPhone and Xcode run 27.

## Emulator

For a loop that needs no phone. Google's Android CLI manages it: `brew tap android/tap && brew install android-cli`, then `android emulator create medium_phone` and `android emulator start --headless <name>`.

- Set `hw.keyboard=no` in `~/.android/avd/<name>.avd/config.ini`, or the software keyboard never shows.
- The bundled Chrome lags stable. Updating it through the Play Store needs a Google account once; the update survives restarts. A Chromium build of a given milestone (`commondatastorage.googleapis.com/chromium-browser-snapshots/Android_Arm64/<build>/chrome-android.zip`) installs without an account, beside Chrome.
- `android layout` and `android input tap` read the accessibility tree there. On a personal phone they install an instrumentation APK: use `android.mjs` instead.

## Pitfalls

- A locked or dozing phone freezes its browser: every CDP call hangs. Check `android.mjs awake` first, and keep the iPhone on **Verrouillage automatique › Jamais**.
- Chrome freezes a tab left in the background, and a CDP call to it hangs: drive the tab on screen.
- `adb shell` runs a shell on the device: quote URLs, or `&` splits the command. `android.mjs open` quotes them.
- `adb shell input swipe` lifts the finger while it still moves, which Chrome reads as a fling. To test a swipe let go halfway, hold the finger still before lifting: `input motionevent DOWN`, `MOVE` steps, a pause, then `UP`. `iphone.mjs swipe` takes the hold as its last argument.
- A swipe that starts on an overlay (a title, a rail of buttons) may not scroll the page: start it mid-screen.
- `uiautomator dump` is killed on recent Android phones; tap through CDP with `android.mjs tap`.
- An empty `pymobiledevice3 usbmux list` while the cable is in: macOS's CoreDevice holds the iPhone. The driver goes through the native tunnel and the tunnel address, so it does not need usbmux.
- The Mac app running the agent needs **Réglages Système › Confidentialité et sécurité › Réseau local** to reach the iPhone's Wi-Fi address or browse Bonjour. The CoreDevice tunnel works without it.
- A Vite dev server keeps a websocket open, so "network idle" never comes; wait for `load`.
- `screenrecord` stops at 3 minutes; chain recordings for longer takes.
- A long-running server or bridge started in the background stops at the agent's background time limit: start it with the longest timeout, and restart it when it stops.
- A Mac that reaches the router but not the Android phone points to Wi-Fi client isolation or a VPN on the phone: go through Tailscale.

## Sources

- Remote debugging and the `chrome_devtools_remote` socket: <https://developer.chrome.com/docs/devtools/remote-debugging>
- `adb` pairing, connect, forward and reverse: <https://developer.android.com/tools/adb>
- Android CLI for agents: <https://developer.android.com/tools/agents/android-cli>
- Tailscale on Android: <https://tailscale.com/docs/install/android.md>
- Chrome's keyboard and viewport rules (`interactive-widget`): <https://developer.chrome.com/blog/viewport-resize-behavior>
- CDP `Input.dispatchTouchEvent`: <https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent>
- `pymobiledevice3` iOS 17+ tunnels and the Web Inspector CDP bridge: <https://doronz88.github.io/pymobiledevice3/>
- WebDriverAgent: <https://github.com/appium/appium-ios/tree/main/packages/webdriveragent>
- `tailscale serve`: <https://tailscale.com/kb/1312/serve>
- Attaching media with GitHub CLI: <https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli>
