import {
  devices,
  expect,
  type Locator,
  type Page,
  type Request
} from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { FREE_CAPS } from '~/helpers/cap'
import { m } from '~/paraglide/messages'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import {
  collectServerFunctionCalls,
  matchIsServerFunctionRequest,
  readServerFunctionCall,
  repeat,
  sendServerFunctionCallsAtOnce
} from './server-functions'

const STUDIO_MEME = E2E_NAMED_MEMES.mostViewed
const STUDIO_PATHNAME = `/memes/${STUDIO_MEME.id}/studio`
const CAPTION_TEXT = 'Le e2e a parlé'
const TRANSCODE_TIMEOUT_MS = 60_000
const GENERATION_TEST_TIMEOUT_MS = 120_000
const CONCURRENT_GENERATION_COUNT = FREE_CAPS.generation * 2
const GENERATIONS_LEFT_AFTER_THE_FIRST = FREE_CAPS.generation - 1

test.use({ viewport: devices['iPhone 15'].viewport })

const getCaptionInput = (page: Page) => {
  return page.getByRole('textbox', { name: m.studio_text_aria() })
}

const getGenerateButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_generate(), exact: true })
}

const getCancelProcessingButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_cancel_processing() })
}

const getEditCaptionButton = (page: Page) => {
  return page.getByRole('button', { name: m.studio_edit(), exact: true })
}

const getUpsellDialog = (page: Page) => {
  return page.getByRole('dialog', { name: m.studio_upsell_title() })
}

const matchIsGenerationRecord = (request: Request) => {
  return (
    matchIsServerFunctionRequest(request) &&
    (request.postData() ?? '').includes(STUDIO_MEME.id)
  )
}

const generateUntil = async (page: Page, signal: Locator) => {
  await repeatUntilVisible(async () => {
    await getCaptionInput(page).fill('')
    await getCaptionInput(page).fill(CAPTION_TEXT)
    await getGenerateButton(page).click()
  }, signal)
}

test.describe('a free User with generations left', () => {
  test.describe.configure({ timeout: GENERATION_TEST_TIMEOUT_MS })
  test.use({ storageState: resolveStorageStatePath('studio') })

  test('gets the video, then their three generations and not one more', async ({
    page
  }) => {
    await page.goto(STUDIO_PATHNAME)
    const recordRequest = page.waitForRequest(matchIsGenerationRecord, {
      timeout: TRANSCODE_TIMEOUT_MS
    })

    await generateUntil(page, getCancelProcessingButton(page))

    await expect(getEditCaptionButton(page)).toBeVisible({
      timeout: TRANSCODE_TIMEOUT_MS
    })
    await expect(getUpsellDialog(page)).toBeHidden()

    const call = readServerFunctionCall(await recordRequest)
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
    await generateUntil(page, getUpsellDialog(page))

    expect(callsAfterTheCap).toStrictEqual([])
  })
})

test.describe('a free User whose generations are spent', () => {
  test.use({ storageState: resolveStorageStatePath('studioCapped') })

  test('is offered Premium instead of a generation', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)
    const serverFunctionCalls = collectServerFunctionCalls(page)

    await generateUntil(page, getUpsellDialog(page))

    expect(serverFunctionCalls).toStrictEqual([])

    await getUpsellDialog(page)
      .getByRole('link', { name: m.nav_upgrade_premium() })
      .click()

    await expect(page).toHaveURL('/pricing')
  })
})

test.describe('a Premium who is past the free cap', () => {
  test.describe.configure({ timeout: GENERATION_TEST_TIMEOUT_MS })
  test.use({ storageState: resolveStorageStatePath('studioPremium') })

  test('gets the video without a cap', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)

    await generateUntil(page, getCancelProcessingButton(page))

    await expect(getEditCaptionButton(page)).toBeVisible({
      timeout: TRANSCODE_TIMEOUT_MS
    })
    await expect(getUpsellDialog(page)).toBeHidden()
  })
})

test.describe('an anonymous Visitor', () => {
  test('is asked for text before anything is generated', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)

    await expect(
      page.getByRole('heading', { level: 1, name: STUDIO_MEME.title })
    ).toBeVisible()
    await expect(getCaptionInput(page)).toBeEmpty()

    await getGenerateButton(page).click()

    await expect(page.getByText(m.studio_enter_text())).toBeVisible()
    await expect(getCancelProcessingButton(page)).toBeHidden()
  })

  test('is sent to sign in before anything is generated', async ({ page }) => {
    await page.goto(STUDIO_PATHNAME)
    const serverFunctionCalls = collectServerFunctionCalls(page)

    await generateUntil(page, getAuthDialogSignInButton(page))

    expect(serverFunctionCalls).toStrictEqual([])
  })
})
