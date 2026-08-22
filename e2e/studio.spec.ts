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

// Fetching the source Video from our server, then transcoding six seconds of it
// in WebAssembly on a single thread. Four seconds on a laptop, and this bound
// sits under the thirty a test gets so that a generation that never finishes
// says so, instead of expiring somewhere in the scenario.
const TRANSCODE_TIMEOUT_MS = 20_000

// `studio_text_label` is « Texte », a substring of the « Texte à ajouter sur la
// vidéo » the phone bar puts on its own input.
const getCaptionInput = (page: Page) => {
  return page.getByLabel(m.studio_text_label(), { exact: true })
}

const getCancelProcessingButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_cancel_processing() })
}

// The processing state carries exactly one name that lasts: its badge and its
// progress bar both spell out a percentage that moves.
const generateVideo = async (page: Page) => {
  await getCaptionInput(page).fill(CAPTION_TEXT)
  await page.getByRole('button', { name: m.studio_generate_video() }).click()

  await expect(getCancelProcessingButton(page)).toBeVisible()
  await expect(getCancelProcessingButton(page)).toBeHidden({
    timeout: TRANSCODE_TIMEOUT_MS
  })
}

// Downloading is what proves a video came out: the button refuses and toasts
// when nothing has been generated.
const downloadGeneratedVideo = async (page: Page) => {
  const downloadPromise = page.waitForEvent('download')

  await page.getByRole('button', { name: m.meme_download_video() }).click()

  await expectDownloadIsNotEmpty(await downloadPromise)
}

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('captions a Meme in the Studio and leaves with the file', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    await generateVideo(page)
    await downloadGeneratedVideo(page)
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  // Nothing stands between a free User and a generation. The plan announced a
  // Premium gate and a free cap of three here, and the code has neither: the
  // Studio serves everyone the watermarked source, and `checkGeneration`, the
  // server function that would refuse a fourth one, is called from nowhere.
  test('captions the same Meme without being asked anything', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    await generateVideo(page)
    await downloadGeneratedVideo(page)
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

  await page.getByRole('button', { name: m.studio_generate_video() }).click()

  await expect(page.getByText(m.studio_enter_text())).toBeVisible()
  await expect(getCancelProcessingButton(page)).toBeHidden()
})
