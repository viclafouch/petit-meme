import { expect, type Page } from '@playwright/test'
import { PREMIUM_REMINDER_STORAGE_KEY } from '~/constants/plan'
import { INSTALL_OFFER_STORAGE_KEY } from '~/constants/pwa'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { expectMemeFileDownloaded } from './downloads'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'

const MEME_PATHNAME = `/memes/${E2E_NAMED_MEMES.mostViewed.id}`

const forgetFollowUps = (page: Page, storageKeys: string[]) => {
  return page.addInitScript((keys) => {
    if (window === window.top) {
      for (const key of keys) {
        localStorage.removeItem(key)
      }
    }
  }, storageKeys)
}

const downloadVideo = async (page: Page) => {
  const formatItem = page.getByRole('menuitem', {
    name: m.meme_format_video()
  })

  await repeatUntilVisible(() => {
    return page
      .getByRole('button', { name: m.meme_download(), exact: true })
      .click()
  }, formatItem)

  const downloadPromise = page.waitForEvent('download')

  await formatItem.click()

  await expectMemeFileDownloaded({
    download: await downloadPromise,
    format: 'mp4'
  })
}

const getPremiumDialog = (page: Page) => {
  return page.getByRole('dialog', { name: m.premium_reminder_title() })
}

test.describe('after an export', () => {
  test('keeps Premium quiet until a download, then takes no for an answer', async ({
    page
  }) => {
    await forgetFollowUps(page, [PREMIUM_REMINDER_STORAGE_KEY])
    await page.goto(MEME_PATHNAME)

    const premiumDialog = getPremiumDialog(page)

    await expect(premiumDialog).toBeHidden()

    await downloadVideo(page)

    await expect(premiumDialog).toBeVisible()

    await premiumDialog
      .getByRole('button', { name: m.common_not_now() })
      .click()

    await expect(premiumDialog).toBeHidden()

    await downloadVideo(page)

    await expect(premiumDialog).toBeHidden()
  })

  test('offers the app on the first export, Premium on the next', async ({
    page
  }) => {
    await forgetFollowUps(page, [
      PREMIUM_REMINDER_STORAGE_KEY,
      INSTALL_OFFER_STORAGE_KEY
    ])
    await page.goto(MEME_PATHNAME)

    await downloadVideo(page)

    await expect(page.getByText(m.install_offer_title())).toBeVisible()
    await expect(getPremiumDialog(page)).toBeHidden()

    await downloadVideo(page)

    await expect(getPremiumDialog(page)).toBeVisible()
  })
})
