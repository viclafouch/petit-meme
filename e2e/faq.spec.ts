import { expect } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { m } from '~/paraglide/messages'
import { baseLocale, locales } from '~/paraglide/runtime'
import { getFaqItems } from '~/routes/_public__root/_default/faq/-lib/faq-items'
import { test } from './fixtures'
import { localizePathname } from './urls'

test.describe('the FAQ page', () => {
  for (const locale of locales) {
    const localeName = locale === baseLocale ? `${locale}, base` : locale

    test(`answers every question in its own language (${localeName})`, async ({
      page
    }) => {
      const response = await page.goto(localizePathname('/faq', locale))

      expect(response?.status()).toBe(HTTP_STATUS.OK)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: m.faq_title({}, { locale })
        })
      ).toBeVisible()

      await expect(
        page.getByRole('main').getByRole('heading', { level: 2 })
      ).toHaveText(
        getFaqItems(locale).map((item) => {
          return item.question
        })
      )
    })
  }

  test('the takedown answer leads to the DMCA procedure', async ({ page }) => {
    await page.goto('/faq')

    await page.getByRole('link', { name: m.faq_takedown_link() }).click()

    await expect(page).toHaveURL('/dmca')
  })

  test('the footer leads to it from the home page', async ({ page }) => {
    await page.goto('/')

    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: m.footer_faq() })
      .click()

    await expect(page).toHaveURL('/faq')
  })
})
