import { readFile } from 'node:fs/promises'
import { BufferSource, Input, MP4 } from 'mediabunny'
import {
  expect,
  type Download,
  type Locator,
  type Page,
  type Request
} from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { FREE_CAPS } from '~/helpers/cap'
import { m } from '~/paraglide/messages'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { expectMemeFileDownloaded } from './downloads'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { buildNamedMemeActionPattern, getMemeList } from './library'
import { E2E_ENGLISH_LOCALE } from './locales'
import {
  collectServerFunctionCalls,
  matchIsServerFunctionRequest,
  readServerFunctionCall,
  repeat,
  sendServerFunctionCallsAtOnce
} from './server-functions'
import { localizePathname } from './urls'
import { readVideoCurrentTime, readVideoIsPaused } from './video'

const STUDIO_MEME = E2E_NAMED_MEMES.mostViewed
const MEME_PATHNAME = `/memes/${STUDIO_MEME.id}`
const STUDIO_PATHNAME = `${MEME_PATHNAME}/studio`
const LIBRARY_PATHNAME = '/memes/category/trending'
const CAPTION_TEXT = 'Le e2e a parlé'
const RENDER_TIMEOUT_MS = 60_000
const EXPORT_TEST_TIMEOUT_MS = 120_000
const CONCURRENT_GENERATION_COUNT = FREE_CAPS.generation * 2
const GENERATIONS_LEFT_AFTER_THE_FIRST = FREE_CAPS.generation - 1
const RATIO_TOLERANCE = 0.01
const IN_ENGLISH = { locale: E2E_ENGLISH_LOCALE } as const

const getStudio = (page: Page) => {
  return page.getByRole('dialog', { name: /Studio/u })
}

const getTopField = (page: Page) => {
  return getStudio(page).getByRole('textbox', { name: m.studio_add_top() })
}

const getDownloadButton = (page: Page) => {
  return getStudio(page).getByRole('button', {
    name: m.meme_download(),
    exact: true
  })
}

const getCaptionSample = (page: Page) => {
  return getStudio(page)
    .getByRole('radio', { name: m.studio_look_white_band() })
    .getByText(CAPTION_TEXT)
}

const getUpsellDialog = (page: Page) => {
  return page.getByRole('dialog', { name: m.studio_upsell_title() })
}

const getPreviewFrame = (page: Page) => {
  return getStudio(page)
    .getByRole('region', { name: m.studio_preview_label() })
    .getByTestId('studio-frame')
}

const openStudioFromTheList = async (page: Page) => {
  const studioItem = page.getByRole('menuitem', { name: m.meme_open_studio() })

  await repeatUntilVisible(() => {
    return (
      getMemeList(page)
        .getByRole('button', {
          name: buildNamedMemeActionPattern(m.meme_open_options_named)
        })
        // oxlint-disable-next-line playwright/no-nth-methods -- any Meme card will do: every card carries the same menu
        .first()
        .click()
    )
  }, studioItem)
  await studioItem.click()
}

const matchIsGenerationRecord = (request: Request) => {
  const body = request.postData() ?? ''

  return (
    matchIsServerFunctionRequest(request) &&
    body.includes(STUDIO_MEME.id) &&
    !body.includes('format')
  )
}

const writeCaption = async (page: Page, target: Locator) => {
  await repeatUntilVisible(async () => {
    await getTopField(page).fill('')
    await getTopField(page).fill(CAPTION_TEXT)
    await getStudio(page).getByRole('heading', { level: 2 }).click()
  }, target)
}

const downloadUntil = async (page: Page, target: Locator) => {
  await repeatUntilVisible(() => {
    return getDownloadButton(page).click()
  }, target)
}

const readVideoRatio = async (download: Download) => {
  const input = new Input({
    source: new BufferSource(await readFile(await download.path())),
    formats: [MP4]
  })
  const videoTrack = await input.getPrimaryVideoTrack()

  if (videoTrack === null) {
    throw new Error('The exported file has no video track')
  }

  return (
    (await videoTrack.getDisplayWidth()) / (await videoTrack.getDisplayHeight())
  )
}

const readPreviewRatio = async (page: Page) => {
  const box = await getPreviewFrame(page).boundingBox()

  if (box === null) {
    throw new Error('The preview frame is not rendered')
  }

  return box.width / box.height
}

test.describe('a free User with generations left', () => {
  test.describe.configure({ timeout: EXPORT_TEST_TIMEOUT_MS })
  test.use({ storageState: resolveStorageStatePath('studio') })

  test('downloads the captioned video as previewed, then their generations and not one more', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)
    await writeCaption(page, getCaptionSample(page))
    await expect(getDownloadButton(page)).toBeEnabled()

    const recordResponse = page.waitForResponse(
      (response) => {
        return matchIsGenerationRecord(response.request())
      },
      { timeout: RENDER_TIMEOUT_MS }
    )
    const downloadPromise = page.waitForEvent('download', {
      timeout: RENDER_TIMEOUT_MS
    })

    await getDownloadButton(page).click()

    const download = await downloadPromise

    await expectMemeFileDownloaded({ download, format: 'mp4' })

    const exportedRatio = await readVideoRatio(download)

    expect(
      Math.abs(exportedRatio - (await readPreviewRatio(page)))
    ).toBeLessThan(RATIO_TOLERANCE)

    const firstGeneration = await recordResponse
    const call = readServerFunctionCall(firstGeneration.request())
    const statuses = await sendServerFunctionCallsAtOnce({
      page,
      call,
      bodies: repeat(call.body, CONCURRENT_GENERATION_COUNT),
      clientIp: 'e2e-studio-concurrent'
    })

    expect(statuses).toStrictEqual([
      ...repeat(HTTP_STATUS.OK, GENERATIONS_LEFT_AFTER_THE_FIRST),
      ...repeat(
        HTTP_STATUS.FORBIDDEN,
        CONCURRENT_GENERATION_COUNT - GENERATIONS_LEFT_AFTER_THE_FIRST
      )
    ])

    await page.reload()
    const callsAfterTheCap = collectServerFunctionCalls(page)

    await writeCaption(page, getCaptionSample(page))
    await downloadUntil(page, getUpsellDialog(page))

    expect(callsAfterTheCap).toStrictEqual([])
  })
})

test.describe('a free User whose generations are spent', () => {
  test.use({ storageState: resolveStorageStatePath('studioCapped') })

  test('is offered Premium instead of a generation', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)
    const serverFunctionCalls = collectServerFunctionCalls(page)

    await writeCaption(page, getCaptionSample(page))
    await downloadUntil(page, getUpsellDialog(page))

    expect(serverFunctionCalls).toStrictEqual([])

    await getUpsellDialog(page)
      .getByRole('link', { name: m.nav_upgrade_premium() })
      .click()

    await expect(page).toHaveURL('/pricing')
  })
})

test.describe('a Premium who is past the free cap', () => {
  test.describe.configure({ timeout: EXPORT_TEST_TIMEOUT_MS })
  test.use({ storageState: resolveStorageStatePath('studioPremium') })

  test('previews and downloads without the watermark nor a cap', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    await expect(
      getPreviewFrame(page).getByTestId('studio-watermark')
    ).toHaveCount(0)

    await writeCaption(page, getCaptionSample(page))

    const downloadPromise = page.waitForEvent('download', {
      timeout: RENDER_TIMEOUT_MS
    })

    await getDownloadButton(page).click()

    await expectMemeFileDownloaded({
      download: await downloadPromise,
      format: 'mp4'
    })
    await expect(getUpsellDialog(page)).toBeHidden()
  })
})

test.describe('an anonymous Visitor', () => {
  test('previews the caption over the watermark before signing in', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)

    await expect(
      page.getByRole('heading', { level: 1, name: STUDIO_MEME.title })
    ).toBeAttached()
    await expect(
      getPreviewFrame(page).getByTestId('studio-watermark')
    ).toHaveCount(1)

    const serverFunctionCalls = collectServerFunctionCalls(page)

    await writeCaption(page, getCaptionSample(page))
    await downloadUntil(page, getAuthDialogSignInButton(page))

    expect(serverFunctionCalls).toStrictEqual([])
  })

  test('leaves the Studio for the Meme page, by the button or by going back', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)
    await repeatUntilVisible(() => {
      return page
        .getByRole('link', { name: m.meme_studio(), exact: true })
        .click()
    }, getStudio(page))

    await expect(page).toHaveURL(STUDIO_PATHNAME)

    await page.goBack()

    await expect(getStudio(page)).toBeHidden()
    await expect(page).toHaveURL(MEME_PATHNAME)

    await page.goto(STUDIO_PATHNAME)
    await repeatUntilVisible(
      () => {
        return getStudio(page)
          .getByRole('button', { name: m.studio_close() })
          .click()
      },
      page.getByRole('link', { name: m.meme_studio(), exact: true })
    )

    await expect(getStudio(page)).toBeHidden()
    await expect(page).toHaveURL(MEME_PATHNAME)
  })

  test('leaves the Meme paused where it stopped once the Studio closes', async ({
    page
  }) => {
    await page.goto(MEME_PATHNAME)

    const stage = page.getByTestId('meme-stage')
    const video = stage.getByTestId('meme-video')

    await expect
      .poll(() => {
        return readVideoCurrentTime(video)
      })
      .toBeGreaterThan(0)
    await repeatUntilVisible(() => {
      return page
        .getByRole('link', { name: m.meme_studio(), exact: true })
        .click()
    }, getStudio(page))

    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(true)

    const pausedAt = await readVideoCurrentTime(video)

    await getStudio(page)
      .getByRole('button', { name: m.studio_close() })
      .click()

    await expect(
      stage.getByRole('button', { name: m.meme_play_video(), exact: true })
    ).toBeAttached()
    await expect
      .poll(() => {
        return readVideoIsPaused(video)
      })
      .toBe(true)
    await expect
      .poll(() => {
        return readVideoCurrentTime(video)
      })
      .toBe(pausedAt)
  })

  test('closes the field with Escape, then the Studio', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)
    await writeCaption(page, getCaptionSample(page))

    await getTopField(page).focus()
    await page.keyboard.press('Escape')

    await expect(getTopField(page)).not.toBeFocused()
    await expect(getStudio(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(getStudio(page)).toBeHidden()
    await expect(page).toHaveURL(MEME_PATHNAME)
  })

  test('opens the Studio over a list of Memes at the same address, and going back closes it', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)
    await openStudioFromTheList(page)

    await expect(getStudio(page)).toBeVisible()
    await expect(page).toHaveURL(LIBRARY_PATHNAME)

    await page.goBack()

    await expect(getStudio(page)).toBeHidden()
    await expect(page).toHaveURL(LIBRARY_PATHNAME)
  })

  test('closes the Studio opened from a list, and a refresh leaves the list alone', async ({
    page
  }) => {
    await page.goto(LIBRARY_PATHNAME)
    await openStudioFromTheList(page)
    await getStudio(page)
      .getByRole('button', { name: m.studio_close() })
      .click()

    await expect(getStudio(page)).toBeHidden()

    await openStudioFromTheList(page)
    await page.reload()

    await expect(getMemeList(page)).toBeVisible()
    await expect(getStudio(page)).toBeHidden()
  })

  test('reads the Studio in English under /en/', async ({ page }) => {
    await page.goto(localizePathname(STUDIO_PATHNAME, E2E_ENGLISH_LOCALE))

    const studio = getStudio(page)

    await expect(
      studio.getByRole('textbox', {
        name: m.studio_add_top({}, IN_ENGLISH)
      })
    ).toBeVisible()
    await expect(
      studio.getByRole('radiogroup', {
        name: m.studio_looks_label({}, IN_ENGLISH)
      })
    ).toBeVisible()
    await expect(page).toHaveTitle(/Studio · /u)
  })
})
