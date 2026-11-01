import { expect, type Page } from '@playwright/test'
import { m } from '~/paraglide/messages.js'
import { E2E_NAMED_MEMES } from './content'
import { expectMemeFileDownloaded } from './downloads'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'

const EXPORTABLE_MEME = E2E_NAMED_MEMES.mostViewed
const EXPORTABLE_MEME_PATHNAME = `/memes/${EXPORTABLE_MEME.id}`

const pickDownloadFormat = async (page: Page, formatLabel: string) => {
  const formatItem = page.getByRole('menuitem', { name: formatLabel })

  await repeatUntilVisible(() => {
    return page
      .getByRole('button', { name: m.meme_download(), exact: true })
      .click()
  }, formatItem)

  await formatItem.click()
}

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('downloads the Video without being asked anything', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, m.meme_download_video())

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      fileName: `${EXPORTABLE_MEME.title}.mp4`
    })
  })

  test('downloads the sound as an MP3', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, m.meme_download_audio())

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      fileName: `${EXPORTABLE_MEME.title}.mp3`
    })
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('is offered Premium and still leaves with the video', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    await pickDownloadFormat(page, m.meme_download_video())

    const upsellDialog = page.getByRole('dialog', {
      name: m.watermark_upsell_title_download()
    })

    const downloadPromise = page.waitForEvent('download')

    await upsellDialog
      .getByRole('button', { name: m.watermark_download_with_watermark() })
      .click()

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      fileName: `${EXPORTABLE_MEME.title}.mp4`
    })
  })

  test('is offered Premium for the sound and says no with the video', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    await pickDownloadFormat(page, m.meme_download_audio())

    const upsellDialog = page.getByRole('dialog', {
      name: m.audio_upsell_title_download()
    })

    const downloadPromise = page.waitForEvent('download')

    await upsellDialog
      .getByRole('button', { name: m.audio_upsell_download_video() })
      .click()

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      fileName: `${EXPORTABLE_MEME.title}.mp4`
    })
    await expect(upsellDialog).toBeHidden()
  })
})

test.describe('a Visitor', () => {
  test('sees the sound as Premium and keeps the video after closing the offer', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    await pickDownloadFormat(page, m.meme_download_audio())

    const audioUpsellDialog = page.getByRole('dialog', {
      name: m.audio_upsell_title_download()
    })

    await expect(audioUpsellDialog).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(audioUpsellDialog).toBeHidden()

    await pickDownloadFormat(page, m.meme_download_video())

    await expect(
      page.getByRole('dialog', { name: m.watermark_upsell_title_download() })
    ).toBeVisible()
  })
})
