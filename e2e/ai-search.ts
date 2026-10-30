import type { Page } from '@playwright/test'
import { m } from '~/paraglide/messages.js'

export const AI_SEARCH_PATH = '/memes/ai-search'

export const getPromptField = (page: Page) => {
  return page.getByRole('textbox', { name: m.ai_search_title() })
}

export const getSubmitButton = (page: Page) => {
  return page.getByRole('button', { name: m.ai_search_submit() })
}

export const submitPrompt = async (page: Page, prompt: string) => {
  await getPromptField(page).fill(prompt)
  await getSubmitButton(page).click()
}
