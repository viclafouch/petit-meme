import type { Page } from '@playwright/test'
import {
  expectActiveSubscription,
  findSubscription,
  payWithTestCard,
  startCheckout
} from './checkout-flow'
import { E2E_ROLES } from './constants'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'
import { matchIsServerFunctionCall } from './server-functions'

// The most viewed Meme is the one a fresh Bookmark cannot move out of trending.
const CAP_LIFT_MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const bookmarkTheMemeOverTheFreeCap = async (page: Page) => {
  await page.goto(CAP_LIFT_MEME_PATHNAME)

  const removeBookmarkButton = page.getByRole('button', {
    name: m.meme_remove_favorite()
  })
  const bookmarkWritten = page.waitForResponse(matchIsServerFunctionCall)

  await repeatUntilVisible(() => {
    return page.getByRole('button', { name: m.meme_add_favorite() }).click()
  }, removeBookmarkButton)

  await bookmarkWritten
  await page.reload()

  await expect(removeBookmarkButton).toBeVisible()
}

test.describe('a monthly checkout', () => {
  test.use({ storageState: resolveStorageStatePath('checkout') })

  test.slow()

  test('turns the User into a Premium and lifts the free cap', async ({
    page
  }) => {
    await page.goto('/pricing')
    await startCheckout(page)
    await payWithTestCard(page, E2E_ROLES.checkout.name)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkout.id)

    expect(await findSubscription(E2E_ROLES.checkout.id)).toMatchObject({
      plan: 'premium',
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

    await startCheckout(page)
    await payWithTestCard(page, E2E_ROLES.checkoutAnnual.name)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectActiveSubscription(E2E_ROLES.checkoutAnnual.id)

    expect(await findSubscription(E2E_ROLES.checkoutAnnual.id)).toMatchObject({
      plan: 'premium-annual',
      status: 'active',
      billingInterval: 'year',
      stripeCustomerId: expect.stringMatching(/^cus_/u),
      stripeSubscriptionId: expect.stringMatching(/^sub_/u),
      periodStart: expect.any(Date),
      periodEnd: expect.any(Date)
    })
  })
})
