import type { Page } from '@playwright/test'
import {
  AI_SEARCH_STAGE_KEYS,
  AI_SEARCH_STAGE_LINGER_MS,
  AI_SEARCH_STAGE_MAX_DELAY_MS,
  FREE_PLAN_MAX_AI_SEARCHES
} from '~/constants/ai-search'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_NAMED_MEMES, E2E_SEARCH_WORD } from './content'
import { resolveStorageStatePath } from './env'
import { expect, test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { getMemeLink } from './library'
import { m } from './messages'
import { SERVER_FUNCTION_URL_PATTERN } from './server-functions'

const AI_SEARCH_PATH = '/memes/ai-search'
const UNANSWERABLE_PROMPT = 'zzzzqqqqxxxx'

const SERVER_ROUND_TRIP_BUDGET_MS = 5000
const RESULTS_TIMEOUT_MS =
  AI_SEARCH_STAGE_KEYS.length * AI_SEARCH_STAGE_MAX_DELAY_MS +
  AI_SEARCH_STAGE_LINGER_MS +
  SERVER_ROUND_TRIP_BUDGET_MS

const getPromptField = (page: Page) => {
  return page.getByRole('textbox', { name: m.ai_search_title() })
}

const getSubmitButton = (page: Page) => {
  return page.getByRole('button', { name: m.ai_search_submit() })
}

const getQuotaCounter = (page: Page) => {
  return page.getByRole('status')
}

const getStagesStatus = (page: Page) => {
  return page
    .getByRole('region', { name: m.ai_search_title() })
    .getByRole('status')
}

const submitPrompt = async (page: Page, prompt: string) => {
  await getPromptField(page).fill(prompt)
  await getSubmitButton(page).click()
}

test.describe('a free User with searches left', () => {
  test.use({ storageState: resolveStorageStatePath('aiSearch') })

  test('searches, gets Memes, and spends one of their three searches', async ({
    page
  }) => {
    await page.goto(AI_SEARCH_PATH)

    await expect(
      page.getByRole('heading', { level: 1, name: m.ai_search_title() })
    ).toBeVisible()
    await expect(getQuotaCounter(page)).toHaveText(
      m.ai_search_remaining_searches({ count: FREE_PLAN_MAX_AI_SEARCHES })
    )

    await submitPrompt(page, E2E_SEARCH_WORD)

    await expect(getMemeLink(page, E2E_NAMED_MEMES.searchTarget)).toBeVisible({
      timeout: RESULTS_TIMEOUT_MS
    })
    await expect(
      page.getByText(m.ai_search_result_count({ count: 1 }), { exact: true })
    ).toBeVisible()
    await expect(getQuotaCounter(page)).toHaveText(
      m.ai_search_remaining_searches({ count: FREE_PLAN_MAX_AI_SEARCHES - 1 })
    )

    await page.reload()

    await expect(getQuotaCounter(page)).toHaveText(
      m.ai_search_remaining_searches({ count: FREE_PLAN_MAX_AI_SEARCHES - 1 })
    )
  })
})

test.describe('a free User whose search finds nothing', () => {
  test.use({ storageState: resolveStorageStatePath('aiSearchNoResults') })

  test('is asked to rephrase rather than left with an empty screen', async ({
    page
  }) => {
    await page.goto(AI_SEARCH_PATH)

    await expect(getQuotaCounter(page)).toHaveText(
      m.ai_search_remaining_searches({ count: FREE_PLAN_MAX_AI_SEARCHES })
    )

    await submitPrompt(page, UNANSWERABLE_PROMPT)

    await expect(page.getByText(m.ai_search_no_results())).toBeVisible({
      timeout: RESULTS_TIMEOUT_MS
    })
  })
})

test.describe('a free User whose search never reaches the server', () => {
  test.use({ storageState: resolveStorageStatePath('aiSearch') })

  test('is told the search failed and gets their form back', async ({
    page
  }) => {
    await page.goto(AI_SEARCH_PATH)

    await expect(getQuotaCounter(page)).toBeVisible()

    await page.route(SERVER_FUNCTION_URL_PATTERN, (route) => {
      return route.abort()
    })

    await submitPrompt(page, E2E_SEARCH_WORD)

    await expect(page.getByText(m.ai_search_error_generic())).toBeVisible()
    await expect(getStagesStatus(page)).toBeHidden()
  })
})

test.describe('a free User whose monthly searches are spent', () => {
  test.use({ storageState: resolveStorageStatePath('aiSearchCapped') })

  test('is offered Premium instead of a search', async ({ page }) => {
    await page.goto(AI_SEARCH_PATH)

    await expect(getQuotaCounter(page)).toHaveText(
      m.ai_search_remaining_searches({ count: 0 })
    )

    await submitPrompt(page, E2E_SEARCH_WORD)

    const dialog = page.getByRole('dialog', {
      name: m.ai_search_upsell_title()
    })

    await expect(dialog).toBeVisible()
    await expect(getStagesStatus(page)).toBeHidden()

    await dialog.getByRole('link', { name: m.nav_upgrade_premium() }).click()

    await expect(page).toHaveURL('/pricing')
  })
})

test.describe('a Premium who is past the free cap', () => {
  test.use({ storageState: resolveStorageStatePath('aiSearchPremium') })

  test('searches without a counter and without a cap', async ({ page }) => {
    await page.goto(AI_SEARCH_PATH)

    await expect(getSubmitButton(page)).toBeEnabled()
    await expect(getQuotaCounter(page)).toBeHidden()

    await submitPrompt(page, E2E_SEARCH_WORD)

    await expect(getMemeLink(page, E2E_NAMED_MEMES.searchTarget)).toBeVisible({
      timeout: RESULTS_TIMEOUT_MS
    })
    await expect(
      page.getByRole('dialog', { name: m.ai_search_upsell_title() })
    ).toBeHidden()
  })
})

test('an anonymous Visitor is sent to sign in, keeps their prompt, and is refused an empty one', async ({
  page
}) => {
  await page.goto(AI_SEARCH_PATH)

  const dialog = page.getByRole('dialog')

  await repeatUntilVisible(async () => {
    await submitPrompt(page, E2E_SEARCH_WORD)
  }, dialog)

  await expect(getAuthDialogSignInButton(page)).toBeVisible()
  await expect(getStagesStatus(page)).toBeHidden()

  await page.keyboard.press('Escape')
  await page.reload()

  await expect(getPromptField(page)).toHaveValue(E2E_SEARCH_WORD)

  await getPromptField(page).fill('')
  await getSubmitButton(page).click()

  await expect(dialog).toBeHidden()
})
