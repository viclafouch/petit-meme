import { expect, type Locator, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { E2E_NAMED_MEMES } from './content'
import { expectMemeFileDownloaded } from './downloads'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getReelAt } from './library'
import { SERVER_FUNCTION_URL_PATTERN } from './server-functions'
import { expectFileWasShared, recordShares } from './share'

const SHARED_MEME = E2E_NAMED_MEMES.mostViewed
const SHARED_MEME_PATHNAME = `/memes/${SHARED_MEME.id}`
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
  const formatItem = page.getByRole('menuitem', { name: formatLabel })

  await repeatUntilVisible(() => {
    return shareButton.click()
  }, formatItem)

  return formatItem
}

const getMemePageShareButton = (page: Page) => {
  return page.getByRole('button', { name: m.meme_share(), exact: true })
}

test.describe('the native share', () => {
  test.describe('a Premium', () => {
    test.use({ storageState: resolveStorageStatePath('premium') })

    test.beforeEach(async ({ page }) => {
      await recordShares({ page })
    })

    test('hands the Video of a Meme page over to the phone', async ({
      page
    }) => {
      await page.goto(SHARED_MEME_PATHNAME)

      const videoItem = await openShareMenu({
        page,
        shareButton: getMemePageShareButton(page),
        formatLabel: m.meme_format_video()
      })

      await videoItem.click()

      await expectFileWasShared({
        page,
        title: SHARED_MEME.title,
        format: 'mp4'
      })
    })

    test('hands the sound of a Meme page over to the phone as an MP3', async ({
      page
    }) => {
      await page.goto(SHARED_MEME_PATHNAME)

      const audioItem = await openShareMenu({
        page,
        shareButton: getMemePageShareButton(page),
        formatLabel: m.meme_format_audio()
      })

      await audioItem.click()

      await expectFileWasShared({
        page,
        title: SHARED_MEME.title,
        format: 'mp3'
      })
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
        page.getByRole('dialog', { name: m.watermark_upsell_title_share() })
      ).toBeHidden()
    })
  })

  test.describe('a Premium whose phone refuses the MP3', () => {
    test.use({ storageState: resolveStorageStatePath('premium') })

    test.beforeEach(async ({ page }) => {
      await recordShares({ page, isFileShareable: false })
    })

    test('downloads the sound instead', async ({ page }) => {
      await page.goto(SHARED_MEME_PATHNAME)

      const audioItem = await openShareMenu({
        page,
        shareButton: getMemePageShareButton(page),
        formatLabel: m.meme_format_audio()
      })

      const downloadPromise = page.waitForEvent('download')

      await audioItem.click()

      await expectMemeFileDownloaded({
        download: await downloadPromise,
        format: 'mp3'
      })
    })
  })

  test.describe('a free User', () => {
    test.use({ storageState: resolveStorageStatePath('free') })

    test.beforeEach(async ({ page }) => {
      await recordShares({ page })
    })

    test('is offered Premium and still shares the video', async ({ page }) => {
      await page.goto(SHARED_MEME_PATHNAME)

      const videoItem = await openShareMenu({
        page,
        shareButton: getMemePageShareButton(page),
        formatLabel: m.meme_format_video()
      })

      await videoItem.click()

      const upsellDialog = page.getByRole('dialog', {
        name: m.watermark_upsell_title_share()
      })

      await upsellDialog
        .getByRole('button', { name: m.watermark_share_with_watermark() })
        .click()

      await expectFileWasShared({
        page,
        title: SHARED_MEME.title,
        format: 'mp4'
      })
      await expect(upsellDialog).toBeHidden()
    })

    test('is offered Premium for the sound and still shares the video', async ({
      page
    }) => {
      await page.goto(SHARED_MEME_PATHNAME)

      const audioItem = await openShareMenu({
        page,
        shareButton: getMemePageShareButton(page),
        formatLabel: m.meme_format_audio()
      })

      await audioItem.click()

      const upsellDialog = page.getByRole('dialog', {
        name: m.audio_upsell_title_share()
      })

      await upsellDialog
        .getByRole('button', { name: m.audio_upsell_share_video() })
        .click()

      await expectFileWasShared({
        page,
        title: SHARED_MEME.title,
        format: 'mp4'
      })
      await expect(upsellDialog).toBeHidden()
    })
  })
})
