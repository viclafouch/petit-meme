---
name: create-pull-request
description: Every Petit Meme pull request starts here, ahead of mattpocock-skills:pr, which it runs itself. Use when opening a pull request or writing its body, including "go pr".
---

# Create a pull request

The pull request opens as `AGENTS.md` describes `go pr`, and its body carries **evidence**: the change shown working, not claimed. Everything here lands in `.artifacts/<branch>/`, which Git ignores.

## 1. Write the body

Run `mattpocock-skills:pr` and write its template to `.artifacts/<branch>/body.md`, with one `Closes #<n>` per issue the branch closes.

Done when every section of the template is filled or cut.

## 2. Choose the evidence

Evidence is proportional to the change:

- **A screen**: a screenshot, before and after when the before exists on `main`.
- **A flow or a motion**: one video.
- **An email**: a screenshot of the email rendered from its `PreviewProps`.
- **Server, CLI or API**: the test that failed and now passes, as text. No media.
- **Docs**: content checked, runnable examples run. No media.

Two media at most. Every screen media shows light and dark side by side. Evidence already captured in the task is reused.

Done when each media has its one-line claim, or the body says why the evidence is text.

## 3. Capture

Playwright drives, ffmpeg assembles.

**A screen or a flow** runs as a throwaway `e2e/evidence.spec.ts`, or `e2e/evidence.mobile.spec.ts` for the phone. Git ignores both. Playwright builds and serves the e2e stack, and `e2e/fixtures.ts` clears the consent banner and the invitations, so the dev server stays Victor's.

```ts
for (const theme of ['light', 'dark'] satisfies Theme[]) {
  test(`evidence ${theme}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: THEME_COOKIE_KEY, value: theme, url: baseURL }])
    const signIn = await page.request.post('/api/auth/sign-in/email', {
      headers: { origin: baseURL ?? '' },
      data: { email: E2E_ROLES.<role>.email, password: E2E_PASSWORD }
    })
    expect(signIn.ok()).toBe(true)
  })
}
```

- The role is the Premium persona `knowledge/offer.md` asks for, unless the change targets another audience. Every role lives in `e2e/constants.ts`.
- Each expected state gets an `expect`, so a red run leaves no misleading media.
- A video needs `test.use({ video: 'on', reducedMotion: 'no-preference' })`. Playwright writes it to `e2e/.results/<test>/video.webm`.
- Run `pnpm exec playwright test e2e/evidence.spec.ts --project=chromium --no-deps`, or `--project=mobile-safari` for the phone. A failed sign-in means the test branch lost its seed, which `--project=seed` restores. Delete the spec after the run.

**An email** renders in a `.artifacts/<branch>/email.ts` script run with `pnpm dlx tsx`, which resolves `~/`. The script renders `createElement(<Email>, <Email>.PreviewProps)` with `render` from `react-email`, passes the HTML to `page.setContent` in a `chromium` page, and screenshots it. The Playwright runner is skipped here because it would build the whole app.

**Assemble** with ffmpeg:

```sh
ffmpeg -i light.png -i dark.png -filter_complex hstack after.png
ffmpeg -i light.webm -i dark.webm -filter_complex "hstack=shortest=1,scale=1920:-2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an flow.mp4
```

Done when every media sits in `.artifacts/<branch>/` under 10 MB, and you opened each screenshot and each claim's frame (`ffmpeg -ss <seconds> -i flow.mp4 -frames:v 1 frame.png`): the state and its label are visible in both themes, and only e2e accounts and test data appear, because the repository is public.

## 4. Open

The body references each media by its path relative to `body.md`, and `--attach` uploads it and rewrites that reference in place. An image reads `![<what it shows>](after.png)`. A video plays inline when `![](flow.mp4)` stands alone in its paragraph. Each media carries the revision it shows: `git rev-parse --short HEAD` on `git branch --show-current`.

```sh
gh pr create --title "<title>" --body-file .artifacts/<branch>/body.md --attach .artifacts/<branch>/<media> --assignee @me --label <label>
gh pr merge <number> --auto --rebase
```

The labels are those of the closed issues. The media go to this pull request only.

Done when `gh pr view --json body` shows a `user-attachments` URL for each media and no local path left, and auto-merge is armed.
