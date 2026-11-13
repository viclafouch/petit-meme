# Phone reference

## Connect

The user reaches their phone through Tailscale: the Mac and the phone sit on the same tailnet, which works across networks and Wi-Fi client isolation. The phone is already paired with this Mac.

1. In one message, ask the user to turn on **Wireless debugging** and **Stay awake** under Developer options, and to send the port shown on the Wireless debugging screen. The port changes each time wireless debugging restarts.
2. `phone.mjs connect <port>` finds the online Android device on the tailnet and runs `adb connect`.

When `adb connect` answers that the device is not paired (new Mac, revoked authorisations): ask the user to open **Pair device with pairing code**, take the code through `request_secret`, and run `phone.mjs adb pair <tailscale-ip>:<pairing-port> <code>`. The pairing port is the one shown in that dialog.

When the phone is missing from `tailscale status`: the Tailscale app on the phone is off or signed out.

`adb` comes with the Android SDK at `~/Library/Android/sdk/platform-tools`, or `brew install --cask android-platform-tools`.

## Emulator

For a loop that needs no phone. Google's Android CLI manages it: `brew tap android/tap && brew install android-cli`, then `android emulator create medium_phone` and `android emulator start --headless <name>`.

- Set `hw.keyboard=no` in `~/.android/avd/<name>.avd/config.ini`, or the software keyboard never shows.
- The bundled Chrome lags stable. Updating it through the Play Store needs a Google account once; the update survives restarts. A Chromium build of a given milestone (`commondatastorage.googleapis.com/chromium-browser-snapshots/Android_Arm64/<build>/chrome-android.zip`) installs without an account, beside Chrome.
- `android layout` and `android input tap` read the accessibility tree there. On a personal phone they install an instrumentation APK: use `phone.mjs` instead.

## Pitfalls

- A locked or dozing phone freezes Chrome: every CDP call hangs. Check `phone.mjs awake` first.
- `adb shell` runs a shell on the device: quote URLs, or `&` splits the command. `phone.mjs open` quotes them.
- `uiautomator dump` is killed on recent Android phones; tap through CDP with `phone.mjs tap`.
- A Vite dev server keeps a websocket open, so "network idle" never comes; wait for `load`.
- `screenrecord` stops at 3 minutes; chain recordings for longer takes.
- A Mac that reaches the router but not the phone points to Wi-Fi client isolation or a VPN on the phone: go through Tailscale.

## Sources

- Remote debugging and the `chrome_devtools_remote` socket: <https://developer.chrome.com/docs/devtools/remote-debugging>
- `adb` pairing, connect, forward and reverse: <https://developer.android.com/tools/adb>
- Android CLI for agents: <https://developer.android.com/tools/agents/android-cli>
- Tailscale on Android: <https://tailscale.com/docs/install/android.md>
- Chrome's keyboard and viewport rules (`interactive-widget`): <https://developer.chrome.com/blog/viewport-resize-behavior>
- CDP `Input.dispatchTouchEvent`: <https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent>
- Attaching media with GitHub CLI: <https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli>
