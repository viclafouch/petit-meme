import { describe, expect, it } from 'vitest'
import { createAnthropicChatWithClient } from '@tanstack/ai-anthropic'
import { AI_SEARCH_MODEL } from '~/constants/ai-search'
import { requestSearchKeywords } from '~/utils/ai-search-keywords'

const REQUEST_CAPTURED_MESSAGE = 'request captured'

const UNSUPPORTED_SCHEMA_KEYWORDS = [
  'minLength',
  'maxLength',
  'maxItems',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf'
]

function findUnsupportedSchemaKeywords(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const isUnsupportedKeyword =
      UNSUPPORTED_SCHEMA_KEYWORDS.includes(key) ||
      (key === 'minItems' && typeof child === 'number' && child > 1)

    return [
      ...(isUnsupportedKeyword ? [key] : []),
      ...findUnsupportedSchemaKeywords(child)
    ]
  })
}

async function captureAnthropicRequest(prompt: string) {
  let sentRequest: unknown

  const adapter = createAnthropicChatWithClient(AI_SEARCH_MODEL, {
    beta: {
      messages: {
        create: (request: unknown) => {
          sentRequest = request
          throw new Error(REQUEST_CAPTURED_MESSAGE)
        }
      }
    }
  })

  await requestSearchKeywords({
    adapter,
    prompt,
    locale: 'fr',
    abortController: new AbortController()
  }).catch((error: unknown) => {
    if (
      !(error instanceof Error) ||
      error.message !== REQUEST_CAPTURED_MESSAGE
    ) {
      throw error
    }
  })

  if (sentRequest === undefined) {
    throw new Error('No request reached the Anthropic client')
  }

  return sentRequest
}

describe('requestSearchKeywords', () => {
  it('should ask the AiSearch model for a native structured output without thinking', async () => {
    const sentRequest = await captureAnthropicRequest('un chat qui dort')

    expect(sentRequest).toMatchObject({
      model: 'claude-haiku-5-5',
      thinking: { type: 'disabled' },
      max_tokens: 256,
      output_config: { format: { type: 'json_schema' } }
    })
  })

  it('should send a schema free of the keywords Anthropic rejects', async () => {
    const sentRequest = await captureAnthropicRequest('un chat qui dort')

    expect(findUnsupportedSchemaKeywords(sentRequest)).toStrictEqual([])
  })
})
