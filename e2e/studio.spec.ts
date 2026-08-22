import type { Page } from '@playwright/test'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { m } from './messages'

// The only Meme whose Video exists at Bunny, so the only one the Studio has
// anything to read.
const STUDIO_MEME = E2E_NAMED_MEMES.mostViewed
const STUDIO_PATHNAME = `/memes/${STUDIO_MEME.id}/studio`

// `studio_text_label` is « Texte », a substring of the « Texte à ajouter sur la
// vidéo » the phone bar puts on its own input.
const getCaptionInput = (page: Page) => {
  return page.getByLabel(m.studio_text_label(), { exact: true })
}

const getGenerateButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_generate_video() })
}

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  // Nothing stands between a free User and a generation. The plan announced a
  // Premium gate and a free cap of three here, and the code has neither: the
  // Studio serves everyone the watermarked source, and `checkGeneration`, the
  // server function that would refuse a fourth generation, is called from
  // nowhere. Where the Export meets a dialog that sells Premium, this surface
  // meets nothing at all.
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
    page.getByRole('heading', { level: 1, name: STUDIO_MEME.title })
  ).toBeVisible()
  await expect(getCaptionInput(page)).toBeEmpty()

  await getGenerateButton(page).click()

  await expect(page.getByText(m.studio_enter_text())).toBeVisible()
  await expect(
    page.getByRole('button', { name: m.studio_cancel_processing() })
  ).toBeHidden()
})
