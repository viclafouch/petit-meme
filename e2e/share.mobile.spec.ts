import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilRequested, repeatUntilVisible } from './hydration'
import { getReels } from './library'
import { m } from './messages'
import { SERVER_FUNCTION_URL_PATTERN } from './server-functions'
import { expectVideoWasShared, recordShares } from './share'

const SHARED_MEME = E2E_NAMED_MEMES.mostViewed
const SHARED_MEME_PATHNAME = `/memes/${SHARED_MEME.id}`

test.beforeEach(async ({ page }) => {
  await recordShares(page)
})

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('hands the Video of a Meme page over to the phone', async ({ page }) => {
    await page.goto(SHARED_MEME_PATHNAME)

    await repeatUntilRequested(
      async () => {
        await page.getByRole('button', { name: m.meme_share_video() }).click()
      },
      { page, urlPattern: SERVER_FUNCTION_URL_PATTERN }
    )

    await expectVideoWasShared({ page, title: SHARED_MEME.title })
  })

  // Reels serves its Memes in a random order and one fixture alone carries a
  // Video that exists at Bunny, so a reel is asked for its file and never for
  // the file itself. The request leaving at all is the assertion: a Visitor
  // taken for a free one gets the upsell dialog instead, and nothing goes out.
  test('asks for the Video of the Meme Reels is showing', async ({ page }) => {
    await page.goto('/reels')

    const shareButton = getReels(page)
      .first()
      .getByRole('button', { name: m.meme_share() })

    await expect(shareButton).toBeVisible()

    await repeatUntilRequested(
      async () => {
        await shareButton.click()
      },
      { page, urlPattern: SERVER_FUNCTION_URL_PATTERN }
    )
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('is offered Premium and still shares the video', async ({ page }) => {
    await page.goto(SHARED_MEME_PATHNAME)

    const upsellDialog = page.getByRole('dialog', {
      name: m.watermark_upsell_title_share()
    })

    await repeatUntilVisible(() => {
      return page.getByRole('button', { name: m.meme_share_video() }).click()
    }, upsellDialog)

    await upsellDialog
      .getByRole('button', { name: m.watermark_share_with_watermark() })
      .click()

    await expectVideoWasShared({ page, title: SHARED_MEME.title })
    await expect(upsellDialog).toBeHidden()
  })
})
