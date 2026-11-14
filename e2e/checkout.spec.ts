import { expect, type Page } from '@playwright/test'
import { PREMIUM_PLAN_NAME } from '~/constants/plan'
import { m } from '~/paraglide/messages'
import {
  completeCheckout,
  expectActiveSubscription,
  expectCheckoutSession,
  findSubscription,
  startCheckout
} from './checkout-flow'
import { E2E_ROLES } from './constants'
import { E2E_NAMED_MEMES } from './content'
import { E2E_STRIPE_PRICE_IDS, resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { expectVisibleAfterReload, repeatUntilVisible } from './hydration'

const CHECKOUT_TIMEOUT_MS = 90_000

const CAP_LIFT_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const bookmarkTheMemeOverTheFreeCap = async (page: Page) => {
  await page.goto(CAP_LIFT_MEME_PATHNAME)

  const removeBookmarkButton = page.getByRole('button', {
    name: m.meme_remove_bookmark()
  })

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.meme_add_bookmark() }).click()
  }, removeBookmarkButton)

  await expectVisibleAfterReload(page, removeBookmarkButton)
}

test.describe('a monthly checkout', () => {
  test.use({ storageState: resolveStorageStatePath('checkout') })

  test.describe.configure({ timeout: CHECKOUT_TIMEOUT_MS })

  test('turns the User into a Premium and lifts the free cap', async ({
    page
  }) => {
    await page.goto('/pricing')
    const checkoutSession = await startCheckout(page)
    await expectCheckoutSession(checkoutSession, {
      referenceId: E2E_ROLES.checkout.id,
      priceId: E2E_STRIPE_PRICE_IDS.monthly
    })
    await completeCheckout(page, checkoutSession)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkout.id)

    expect(await findSubscription(E2E_ROLES.checkout.id)).toMatchObject({
      plan: PREMIUM_PLAN_NAME,
      status: 'active',
      billingInterval: 'month',
      stripeCustomerId: expect.stringMatching(/^cus_/u),
      stripeSubscriptionId: expect.stringMatching(/^sub_/u),
      periodStart: expect.any(Date),
      periodEnd: expect.any(Date)
    })

    await page.goto('/pricing')
    await expect(
      page.getByRole('button', { name: m.pricing_active_plan_sr() })
    ).toBeVisible()

    await bookmarkTheMemeOverTheFreeCap(page)
  })
})

test.describe('an annual checkout', () => {
  test.use({ storageState: resolveStorageStatePath('checkoutAnnual') })

  test('turns the User into a Premium billed by the year', async ({ page }) => {
    await page.goto('/pricing')

    await repeatUntilVisible(
      async () => {
        await page.getByRole('radio', { name: m.pricing_yearly() }).click()
      },
      page.getByRole('radio', { name: m.pricing_yearly(), checked: true })
    )

    const checkoutSession = await startCheckout(page)
    await expectCheckoutSession(checkoutSession, {
      referenceId: E2E_ROLES.checkoutAnnual.id,
      priceId: E2E_STRIPE_PRICE_IDS.yearly
    })
    await completeCheckout(page, checkoutSession)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkoutAnnual.id)

    expect(await findSubscription(E2E_ROLES.checkoutAnnual.id)).toMatchObject({
      plan: PREMIUM_PLAN_NAME,
      status: 'active',
      billingInterval: 'year',
      stripeCustomerId: expect.stringMatching(/^cus_/u),
      stripeSubscriptionId: expect.stringMatching(/^sub_/u),
      periodStart: expect.any(Date),
      periodEnd: expect.any(Date)
    })
  })
})
