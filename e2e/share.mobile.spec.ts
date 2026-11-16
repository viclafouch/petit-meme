import { expect, type Locator, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getReelAt } from './library'
import { SERVER_FUNCTION_URL_PATTERN } from './server-functions'
import { recordShares } from './share'

const FIRST_REEL_INDEX = 0

type OpenShareMenuParams = {
  page: Page
  shareButton: Locator
  formatLabel: string
}

const openShareMenu = async ({
  page,
  shareButton,
  formatLabel
}: OpenShareMenuParams) => {
  const formatItem = page
    .getByRole('dialog', { name: m.meme_share() })
    .getByRole('button', { name: formatLabel })

  await repeatUntilVisible(() => {
    return shareButton.click()
  }, formatItem)

  return formatItem
}

test.describe('the native share', () => {
  test.describe('a Premium', () => {
    test.use({ storageState: resolveStorageStatePath('premium') })

    test.beforeEach(async ({ page }) => {
      await recordShares({ page })
    })

    test('asks for the Video of the Meme Reels is showing', async ({
      page
    }) => {
      await page.goto('/reels')

      const videoItem = await openShareMenu({
        page,
        shareButton: getReelAt(page, FIRST_REEL_INDEX).getByRole('button', {
          name: m.meme_share()
        }),
        formatLabel: m.meme_format_video()
      })

      await Promise.all([
        page.waitForRequest(SERVER_FUNCTION_URL_PATTERN),
        videoItem.click()
      ])

      await expect(
        page.getByRole('dialog', { name: m.premium_reminder_title() })
      ).toBeHidden()
    })
  })
})
