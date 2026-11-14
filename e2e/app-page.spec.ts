import { expect, type Page } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { buildAppQrCodePath } from '~/helpers/web-app-assets'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import { test } from './fixtures'
import { E2E_ENGLISH_LOCALE, E2E_LOCALE } from './locales'
import { localizePathname } from './urls'

const getQrCode = (page: Page, locale: Locale) => {
  return page.getByRole('img', { name: m.app_page_qr_alt({}, { locale }) })
}

test.describe('the app page on a computer', () => {
  for (const locale of [E2E_LOCALE, E2E_ENGLISH_LOCALE] satisfies Locale[]) {
    test(`hands the app to the phone through a QR code (${locale})`, async ({
      page
    }) => {
      const response = await page.goto(localizePathname('/app', locale))

      expect(response?.status()).toBe(HTTP_STATUS.OK)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: m.app_page_title({}, { locale })
        })
      ).toBeVisible()

      const qrCode = getQrCode(page, locale)

      await expect(qrCode).toBeVisible()
      await expect(qrCode).toHaveAttribute('src', buildAppQrCodePath(locale))
      await expect
        .poll(() => {
          return qrCode.evaluate((image: HTMLImageElement) => {
            return image.naturalWidth
          })
        })
        .toBeGreaterThan(0)
    })
  }
})
