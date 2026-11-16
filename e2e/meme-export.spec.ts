import { expect, type Page } from '@playwright/test'
import type { MemeDerivedFormat } from '~/constants/bunny'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { expectMemeFileDownloaded } from './downloads'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { buildNamedMemeActionPattern, getMemeList } from './library'

const EXPORTABLE_MEME = E2E_NAMED_MEMES.mostViewed
const EXPORTABLE_MEME_PATHNAME = `/memes/${EXPORTABLE_MEME.id}`

const DOWNLOAD_LABELS = {
  mp4: { format: m.meme_format_video, action: m.meme_download_video },
  mp3: { format: m.meme_format_audio, action: m.meme_download_sound }
} as const satisfies Record<
  MemeDerivedFormat,
  { format: () => string; action: () => string }
>

const pickDownloadFormat = async (page: Page, format: MemeDerivedFormat) => {
  const formatRadio = page.getByRole('radio', {
    name: DOWNLOAD_LABELS[format].format()
  })

  await repeatUntilVisible(() => {
    return page
      .getByRole('button', { name: m.meme_download(), exact: true })
      .click()
  }, formatRadio)

  await formatRadio.click()
  await page
    .getByRole('button', {
      name: DOWNLOAD_LABELS[format].action(),
      exact: true
    })
    .click()
}

const getFirstMemeCardOptionsButton = (page: Page) => {
  return (
    getMemeList(page)
      .getByRole('button', {
        name: buildNamedMemeActionPattern(m.meme_open_options_named)
      })
      // oxlint-disable-next-line playwright/no-nth-methods -- any Meme card will do: every card carries the same menu
      .first()
  )
}

test.describe('a Premium', () => {
  test.use({ storageState: resolveStorageStatePath('premium') })

  test('downloads the Video without being asked anything', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, 'mp4')

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp4'
    })
  })

  test('downloads the sound as an MP3', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, 'mp3')

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp3'
    })
  })
})

test.describe('a free User', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('leaves with the video straight away', async ({ page }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, 'mp4')

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp4'
    })
  })

  test('picks the sound from the download submenu of a Meme card', async ({
    page
  }) => {
    await page.goto('/memes')

    const downloadSubmenu = page.getByRole('menuitem', {
      name: m.meme_download(),
      exact: true
    })

    await repeatUntilVisible(() => {
      return getFirstMemeCardOptionsButton(page).click()
    }, downloadSubmenu)

    await downloadSubmenu.press('ArrowRight')

    const audioItem = page.getByRole('menuitem', {
      name: m.meme_format_audio()
    })

    await expect(audioItem).toBeVisible()
    await audioItem.press('Enter')

    await expect(
      page.getByRole('dialog', { name: m.audio_upsell_title_download() })
    ).toBeVisible()
  })

  test('is offered Premium for the sound and says no with the video', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    await pickDownloadFormat(page, 'mp3')

    const upsellDialog = page.getByRole('dialog', {
      name: m.audio_upsell_title_download()
    })

    const downloadPromise = page.waitForEvent('download')

    await upsellDialog
      .getByRole('button', { name: m.audio_upsell_download_video() })
      .click()

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp4'
    })
    await expect(upsellDialog).toBeHidden()
  })
})

test.describe('a Visitor', () => {
  test('sees the sound as Premium and keeps the video after closing the offer', async ({
    page
  }) => {
    await page.goto(EXPORTABLE_MEME_PATHNAME)

    await pickDownloadFormat(page, 'mp3')

    const audioUpsellDialog = page.getByRole('dialog', {
      name: m.audio_upsell_title_download()
    })

    await expect(audioUpsellDialog).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(audioUpsellDialog).toBeHidden()

    const downloadPromise = page.waitForEvent('download')

    await pickDownloadFormat(page, 'mp4')

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp4'
    })
  })
})
