import { expect, type Locator, type Page } from '@playwright/test'

const HYDRATED_ACTION_MS = 5000
const HYDRATION_GIVE_UP_MS = 20_000

// A page is server rendered before React attaches, and Playwright cannot tell
// the difference: a click is lost, and so is a fill, whose text stays in the
// field while nothing on the page was told about it. Repeating the whole
// sequence until its result shows up is the only signal we have. Both helpers
// here apply to the first action on a freshly loaded page, and to nothing after
// it.
//
// A repeated fill has to change the value to carry: React reads the input on
// arrival and starts tracking what it finds there, so typing the same text a
// second time is a change for nobody. Empty the field before every attempt.

// For an action whose result is on screen and stays there.
export const repeatUntilVisible = async (
  act: () => Promise<unknown>,
  target: Locator
) => {
  await expect(async () => {
    await act()
    await expect(target).toBeVisible({ timeout: HYDRATED_ACTION_MS })
  }).toPass({ timeout: HYDRATION_GIVE_UP_MS })
}

type RepeatUntilNavigatedParams = {
  page: Page
  from: string
}

export const repeatUntilNavigated = async (
  act: () => Promise<unknown>,
  { page, from }: RepeatUntilNavigatedParams
) => {
  await expect(async () => {
    await act()
    await expect(page).not.toHaveURL(from, { timeout: HYDRATED_ACTION_MS })
  }).toPass({ timeout: HYDRATION_GIVE_UP_MS })
}

type RepeatUntilRequestedParams = {
  page: Page
  urlPattern: RegExp
}

// For an action whose result is a request, when the screen says nothing that
// lasts. It repeats only when nothing left, so the server never sees a double.
export const repeatUntilRequested = async (
  act: () => Promise<unknown>,
  { page, urlPattern }: RepeatUntilRequestedParams
) => {
  await expect(async () => {
    await Promise.all([
      page.waitForRequest(urlPattern, { timeout: HYDRATED_ACTION_MS }),
      act()
    ])
  }).toPass({ timeout: HYDRATION_GIVE_UP_MS })
}
