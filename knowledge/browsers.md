# Browsers

Petit Meme works on every browser people use today: Safari on iPhone and Mac, Chrome on Android and desktop, Edge and Firefox. A browser a few years old still gets a site that works. A much older one may not.

## Modern first

Petit Meme follows the newest web standards, as Chrome's Modern Web Guidance teaches them. The web moves fast, and what once took a script, the browser now does on its own, from dialogs to motion that follows the scroll. The more native Petit Meme is, the faster, lighter on the phone and more accessible it gets.

Modern never costs a supported browser. A new feature first checks that the browser has it, and falls back to an older way, with a script only as the last resort.

One exception: the Studio makes its video with the browser's own video encoder, so a browser without one (Firefox on Android today) shows that it cannot make the video, and keeps everything else.

Newer browsers get extras on top: smoother transitions, a steadier page while it loads. Older ones keep a site that works and looks right, only plainer. Nobody is left with a broken page because their browser is a little behind.

## What people notice

- **Their settings win.** Someone who turns off animations on their phone gets a calm site. Dark mode reaches every corner of the screen.
- **The page holds still.** Videos, images and titles keep their place while the page loads.

## Light on a modest phone

A Meme page comes alive fast on an ordinary phone, not only on a recent one. Decoration pays its way: a blur, a glow or a shadow is drawn once and kept, never redrawn while the video plays, because a phone without a strong graphics chip spends its power there instead of starting the video. The automated tests stand in for that phone, with Safari on a slow machine. When they wait too long for a video to start, the page got heavier, and the fix belongs in the page, never in a longer wait in the test.
