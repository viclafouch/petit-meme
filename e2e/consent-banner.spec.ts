import { CONSENT_BANNER_DELAY_MS, CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

const HYDRATION_GRACE_MS = 10_000
const BANNER_TIMEOUT_MS = CONSENT_BANNER_DELAY_MS + HYDRATION_GRACE_MS

const REFUSED_CLICK_TIMEOUT_MS = 2000

test('the consent banner asks on a first visit, and the answer survives a reload', async ({
  page
}) => {
  await page.context().clearCookies({ name: CONSENT_COOKIE_KEY })
  await page.goto('/')

  const banner = page.getByRole('dialog', {
    name: m.cookie_title(),
    exact: true
  })

  await expect(banner).toBeVisible({ timeout: BANNER_TIMEOUT_MS })

  await banner.getByRole('button', { name: m.cookie_accept() }).click()

  await expect(banner).toBeHidden()

  await page.reload()

  const analyticsSwitch = page.getByRole('switch', {
    name: m.cookie_category_analytics_label()
  })

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.cookie_manage() }).click()
  }, analyticsSwitch)

  await expect(analyticsSwitch).toBeChecked()
})

test('the consent banner holds the page until it is answered', async ({
  page
}) => {
  await page.context().clearCookies({ name: CONSENT_COOKIE_KEY })
  await page.goto('/')

  const banner = page.getByRole('dialog', {
    name: m.cookie_title(),
    exact: true
  })

  await expect(banner).toBeVisible({ timeout: BANNER_TIMEOUT_MS })

  const libraryLink = page.getByRole('link', {
    name: m.home_hero_cta_discover()
  })

  await expect(
    libraryLink.click({ trial: true, timeout: REFUSED_CLICK_TIMEOUT_MS })
  ).rejects.toThrow()

  await banner.getByRole('button', { name: m.cookie_accept() }).click()

  await expect(banner).toBeHidden()
  await libraryLink.click({ trial: true })
})
