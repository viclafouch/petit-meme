import { E2E_NAMED_MEMES } from './content'
import { expectDownloadIsNotEmpty } from './download'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { m } from './messages'

const EXPORTABLE_MEME = E2E_NAMED_MEMES.mostViewed
const EXPORTABLE_MEME_PATHNAME = `/memes/${EXPORTABLE_MEME.id}`

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('downloads the Video without being asked anything', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await page.getByRole('button', { name: m.meme_download_video() }).click()

    await expectDownloadIsNotEmpty(await downloadPromise)
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('is offered Premium and still leaves with the video', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const upsellDialog = page.getByRole('dialog', {
      name: m.watermark_upsell_title_download()
    })

    await repeatUntilVisible(() => {
      return page.getByRole('button', { name: m.meme_download_video() }).click()
    }, upsellDialog)

    const downloadPromise = page.waitForEvent('download')

    await upsellDialog
      .getByRole('button', { name: m.watermark_download_with_watermark() })
      .click()

    await expectDownloadIsNotEmpty(await downloadPromise)
  })
})
