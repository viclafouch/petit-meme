import type { Page } from '@playwright/test'
import { E2E_NAMED_MEMES } from './content'
import { expectDownloadIsNotEmpty } from './download'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { m } from './messages'

// The only Meme whose Video exists at Bunny, so the only one ffmpeg has
// anything to read.
const GENERATED_MEME = E2E_NAMED_MEMES.mostViewed
const STUDIO_PATHNAME = `/memes/${GENERATED_MEME.id}/studio`

const CAPTION_TEXT = 'Le e2e a parlé'

// Four seconds on a laptop, past thirty on a runner, which is what the first
// green local run and the first red CI one measured between them. Two cores
// instantiating a thirty two megabyte WebAssembly core, then transcoding six
// seconds of video on a single thread. Only the scenario that transcodes pays
// this, and it pays it with `test.slow()`.
const TRANSCODE_TIMEOUT_MS = 60_000

// `studio_text_label` is « Texte », a substring of the « Texte à ajouter sur la
// vidéo » the phone bar puts on its own input.
const getCaptionInput = (page: Page) => {
  return page.getByLabel(m.studio_text_label(), { exact: true })
}

const getGenerateButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_generate_video() })
}

const getCancelProcessingButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_cancel_processing() })
}

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  // The one scenario that runs the whole pipeline: the source Video off Bunny,
  // ffmpeg in the browser, and a file at the end. The free User below walks the
  // same code, so transcoding twice would buy nothing and cost a minute.
  test('captions a Meme in the Studio and leaves with the file', async ({
    page
  }) => {
    test.slow()

    await page.goto(STUDIO_PATHNAME)

    await getCaptionInput(page).fill(CAPTION_TEXT)
    await getGenerateButton(page).click()

    // The processing state carries exactly one name that lasts: its badge and
    // its progress bar both spell out a percentage that moves.
    await expect(getCancelProcessingButton(page)).toBeVisible()
    await expect(getCancelProcessingButton(page)).toBeHidden({
      timeout: TRANSCODE_TIMEOUT_MS
    })

    const downloadPromise = page.waitForEvent('download')

    // Downloading is what proves a video came out: the button refuses and
    // toasts when nothing has been generated.
    await page.getByRole('button', { name: m.meme_download_video() }).click()

    await expectDownloadIsNotEmpty(await downloadPromise)
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  // Nothing stands between a free User and a generation, which is the whole
  // point of the scenario and the reason it stops short of transcoding. The
  // plan announced a Premium gate and a free cap of three here, and the code
  // has neither: the Studio serves everyone the watermarked source, and
  // `checkGeneration`, the server function that would refuse a fourth
  // generation, is called from nowhere. Where the Export meets a dialog that
  // sells Premium, this surface meets nothing at all.
  test('reaches the Studio with nothing in the way', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)

    await expect(getCaptionInput(page)).toBeEditable()
    await expect(getGenerateButton(page)).toBeEnabled()
    await expect(
      page.getByRole('dialog', { name: m.watermark_upsell_title_download() })
    ).toBeHidden()
  })
})

// The Studio route carries no guard, so this also says it opens without an
// account, which is what the free library promises.
test('an anonymous Visitor is asked for text before anything is generated', async ({
  page
}) => {
  await page.goto(STUDIO_PATHNAME)

  await expect(
    page.getByRole('heading', { level: 1, name: GENERATED_MEME.title })
  ).toBeVisible()
  await expect(getCaptionInput(page)).toBeEmpty()

  await getGenerateButton(page).click()

  await expect(page.getByText(m.studio_enter_text())).toBeVisible()
  await expect(getCancelProcessingButton(page)).toBeHidden()
})
