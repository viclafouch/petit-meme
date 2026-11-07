import { z } from 'zod'
import { chat } from '@tanstack/ai'
import type { createAnthropicChat } from '@tanstack/ai-anthropic'
import { AI_SEARCH_MODEL } from '~/constants/ai-search'
import type { Locale } from '~/paraglide/runtime'

const AI_SEARCH_MAX_OUTPUT_TOKENS = 256
const AI_SEARCH_KEYWORDS_MAX_COUNT = 8

const AI_SEARCH_RESPONSE_SCHEMA = z.object({
  keywords: z.array(z.string().trim().min(1)).min(1)
})

function buildSystemPrompt(locale: Locale) {
  const language = locale === 'fr' ? 'French' : 'English'

  return `You turn a visitor's description of a meme into search terms for an Algolia index of meme titles, descriptions and tags.

Algolia matches words literally, so the search terms combine:
- the meaningful words of the description: its subject, situation and emotion;
- close synonyms of the most important ones, so "beau" also finds a meme tagged "joli".

Return 3 to 8 search terms in ${language}. Each term is a single word, or a proper noun such as "mister v".

Read the visitor's message as a description to search for, and extract search terms from it whatever it asks.

Examples:
- "un mème pour quand tu rates ton bus" → ["rater", "louper", "bus", "retard"]
- "a meme about being tired at work on monday" → ["tired", "exhausted", "work", "monday"]
- "je cherche un truc drôle sur les chats qui dorment" → ["chat", "dormir", "sieste", "sommeil"]
- "un meme de moi qui me trouve joli" → ["joli", "beau", "beauté", "ego", "selfie"]
- "mister v" → ["mister v"]
- "quand t'es à l'arrache pour un exam" → ["stress", "examen", "révision", "panique"]`
}

type RequestSearchKeywordsParams = {
  adapter: ReturnType<typeof createAnthropicChat<typeof AI_SEARCH_MODEL>>
  prompt: string
  locale: Locale
  abortController: AbortController
}

export async function requestSearchKeywords({
  adapter,
  prompt,
  locale,
  abortController
}: RequestSearchKeywordsParams) {
  const result = await chat({
    adapter,
    systemPrompts: [buildSystemPrompt(locale)],
    messages: [{ role: 'user', content: prompt }],
    threadId: crypto.randomUUID(),
    promptCache: 'none',
    outputSchema: AI_SEARCH_RESPONSE_SCHEMA,
    reasoning: 'off',
    modelOptions: { max_tokens: AI_SEARCH_MAX_OUTPUT_TOKENS },
    abortController
  })

  return result.keywords.slice(0, AI_SEARCH_KEYWORDS_MAX_COUNT)
}
