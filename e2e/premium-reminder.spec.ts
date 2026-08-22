import type { Page } from '@playwright/test'
import {
  PREMIUM_REMINDER_DELAY_MS,
  PREMIUM_REMINDER_STORAGE_KEY
} from '~/constants/plan'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_CATEGORIES, E2E_NAMED_MEMES } from './content'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

const HYDRATION_GRACE_MS = 10_000
const REMINDER_TIMEOUT_MS = PREMIUM_REMINDER_DELAY_MS + HYDRATION_GRACE_MS
const TWO_REMINDER_CHECKS_MS = PREMIUM_REMINDER_DELAY_MS * 2
const CATEGORY_PATHNAME = `/memes/category/${E2E_CATEGORIES.chats.slug}`
const MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const clearPremiumReminderSnooze = (page: Page) => {
  return page.addInitScript((storageKey) => {
    localStorage.removeItem(storageKey)
  }, PREMIUM_REMINDER_STORAGE_KEY)
}

const getPremiumReminder = (page: Page) => {
  return page.getByRole('dialog', { name: m.premium_reminder_title() })
}

test('the Premium reminder speaks once the delay is past, takes a no for an answer, and stays away', async ({
  page
}) => {
  await clearPremiumReminderSnooze(page)
  await page.goto(CATEGORY_PATHNAME)

  const reminder = getPremiumReminder(page)

  await expect(reminder).toBeVisible({ timeout: REMINDER_TIMEOUT_MS })

  await reminder.getByRole('button', { name: m.common_not_now() }).click()

  await expect(reminder).toBeHidden()

  await page.getByRole('link', { name: m.nav_plans() }).click()

  await expect(page).toHaveURL('/pricing')

  await page.clock.install()
  await page.getByRole('link', { name: m.nav_memes() }).click()

  await expect(page).toHaveURL('/memes/category/trending')

  await page.clock.runFor(TWO_REMINDER_CHECKS_MS)

  await expect(reminder).toBeHidden()
})

test('the Premium reminder waits its turn behind an open dialog', async ({
  page
}) => {
  await page.clock.install()
  await clearPremiumReminderSnooze(page)
  await page.goto(MEME_PATHNAME)

  const signInButton = getAuthDialogSignInButton(page)

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.meme_add_favorite() }).click()
  }, signInButton)

  await page.clock.runFor(TWO_REMINDER_CHECKS_MS)

  await expect(getPremiumReminder(page)).toBeHidden()
  await expect(signInButton).toBeVisible()

  await page.keyboard.press('Escape')
  await page.clock.runFor(PREMIUM_REMINDER_DELAY_MS)

  await expect(getPremiumReminder(page)).toBeVisible()
})
