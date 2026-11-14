import { expect } from '@playwright/test'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import { test } from './fixtures'
import { E2E_ENGLISH_LOCALE, E2E_LOCALE } from './locales'
import { localizePathname } from './urls'

test.describe('the app page on a phone', () => {
  for (const locale of [E2E_LOCALE, E2E_ENGLISH_LOCALE] satisfies Locale[]) {
    test(`offers the install before the demo, without the QR code (${locale})`, async ({
      page
    }) => {
      await page.goto(localizePathname('/app', locale))

      const installGuide = page
        .getByText(m.install_guide_ios_description({}, { locale }))
        .or(page.getByText(m.install_guide_browser_description({}, { locale })))
      const demo = page.getByRole('figure', {
        name: m.app_page_demo_label({}, { locale })
      })

      await expect(installGuide).toBeVisible()
      await expect(demo).toBeVisible()
      await expect(
        page.getByRole('img', { name: m.app_page_qr_alt({}, { locale }) })
      ).toBeHidden()

      const guideBox = await installGuide.boundingBox()
      const demoBox = await demo.boundingBox()

      expect(guideBox?.y).toBeLessThan(demoBox?.y ?? Number.NaN)
    })
  }
})
