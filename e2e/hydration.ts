import { expect, type Locator, type Page } from '@playwright/test'

const HYDRATED_ACTION_MS = 5000
const HYDRATION_GIVE_UP_MS = 20_000

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
