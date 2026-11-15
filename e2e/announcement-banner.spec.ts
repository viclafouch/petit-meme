import { expect } from '@playwright/test'
import { ANNOUNCEMENT_DAY } from '~/constants/announcement'
import { COOKIE_ANNOUNCEMENT_DISMISSED_KEY } from '~/constants/cookie'
import { formatDate } from '~/helpers/date'
import { m } from '~/paraglide/messages'
import { baseLocale } from '~/paraglide/runtime'
import { test } from './fixtures'

const HYDRATED_ACTION_MS = 5000
const HYDRATION_GIVE_UP_MS = 20_000

test.describe('the announcement banner', () => {
  test('the announcement closes for good', async ({ page, context }) => {
    await context.clearCookies({ name: COOKIE_ANNOUNCEMENT_DISMISSED_KEY })
    await page.goto('/')

    const announcement = page.getByText(
      m.announcement_banner_message({
        date: formatDate(new Date(ANNOUNCEMENT_DAY), baseLocale)
      })
    )

    await expect(announcement).toBeVisible()

    await expect(async () => {
      await page
        .getByRole('status')
        .filter({ has: announcement })
        .getByRole('button', { name: m.common_close() })
        .click()
      await expect(announcement).toBeHidden({ timeout: HYDRATED_ACTION_MS })
    }).toPass({ timeout: HYDRATION_GIVE_UP_MS })

    await page.reload()

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(announcement).toBeHidden()
  })
})
