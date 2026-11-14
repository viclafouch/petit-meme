import type { Page } from '@playwright/test'
import {
  AI_SEARCH_STAGE_KEYS,
  AI_SEARCH_STAGE_LINGER_MS,
  AI_SEARCH_STAGE_MAX_DELAY_MS
} from '~/constants/ai-search'
import { m } from '~/paraglide/messages'

export const AI_SEARCH_PATH = '/memes/ai-search'

const SERVER_ROUND_TRIP_BUDGET_MS = 5000

export const AI_SEARCH_RESULTS_TIMEOUT_MS =
  AI_SEARCH_STAGE_KEYS.length * AI_SEARCH_STAGE_MAX_DELAY_MS +
  AI_SEARCH_STAGE_LINGER_MS +
  SERVER_ROUND_TRIP_BUDGET_MS

export const getPromptField = (page: Page) => {
  return page.getByRole('textbox', { name: m.ai_search_title() })
}

export const getSubmitButton = (page: Page) => {
  return page.getByRole('button', { name: m.ai_search_submit() })
}

export const submitPrompt = async (page: Page, prompt: string) => {
  await getPromptField(page).fill('')
  await getPromptField(page).fill(prompt)
  await getSubmitButton(page).click()
}
