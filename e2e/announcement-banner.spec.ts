import { expect, type Locator, type Page } from '@playwright/test'
import { ANNOUNCEMENT_DAY } from '~/constants/banner'
import {
  COOKIE_ANNOUNCEMENT_DISMISSED_KEY,
  COOKIE_LOCALE_BANNER_DISMISSED_KEY
} from '~/constants/cookie'
import { formatDate } from '~/helpers/date'
import { getLocaleDisplayName } from '~/helpers/locale'
import { m } from '~/paraglide/messages'
import { baseLocale, type Locale } from '~/paraglide/runtime'
import { test } from './fixtures'
import { repeatUntilHidden } from './hydration'
import { E2E_ENGLISH_LOCALE } from './locales'
import { localizePathname } from './urls'

const getAnnouncement = (page: Page, locale: Locale) => {
  return page.getByText(
    m.announcement_banner_message(
      { date: formatDate(new Date(ANNOUNCEMENT_DAY), locale) },
      { locale }
    )
  )
}

type CloseBannerParams = {
  page: Page
  content: Locator
  locale: Locale
}

const closeBanner = ({ page, content, locale }: CloseBannerParams) => {
  return repeatUntilHidden(() => {
    return page
      .getByRole('status')
      .filter({ has: content })
      .getByRole('button', { name: m.common_close({}, { locale }) })
      .click()
  }, content)
}

test.describe('the announcement banner', () => {
  test('closes for good', async ({ page, context }) => {
    await context.clearCookies({ name: COOKIE_ANNOUNCEMENT_DISMISSED_KEY })
    await page.goto('/')

    const announcement = getAnnouncement(page, baseLocale)

    await expect(announcement).toBeVisible()

    await closeBanner({ page, content: announcement, locale: baseLocale })

    await page.reload()

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(announcement).toBeHidden()
  })

  test('gives way to the language suggestion, then comes back', async ({
    page,
    context
  }) => {
    await context.clearCookies({ name: COOKIE_ANNOUNCEMENT_DISMISSED_KEY })
    await context.clearCookies({ name: COOKIE_LOCALE_BANNER_DISMISSED_KEY })
    await page.goto(localizePathname('/', E2E_ENGLISH_LOCALE))

    const announcement = getAnnouncement(page, E2E_ENGLISH_LOCALE)
    const suggestion = page.getByText(
      m.locale_banner_available(
        {
          language: getLocaleDisplayName(baseLocale, E2E_ENGLISH_LOCALE)
        },
        { locale: E2E_ENGLISH_LOCALE }
      )
    )

    await expect(suggestion).toBeVisible()
    await expect(announcement).toBeHidden()

    await closeBanner({
      page,
      content: suggestion,
      locale: E2E_ENGLISH_LOCALE
    })

    await expect(announcement).toBeVisible()
  })
})
