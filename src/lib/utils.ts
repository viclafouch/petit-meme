import { createCn, validators } from 'cn/config'
import type { ZodType } from 'zod'
import { IS_DEVELOPMENT } from '~/constants/env'
import { logger } from '~/lib/logger'

export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'banner'] }],
      leading: [{ leading: ['display', 'heading'] }],
      'max-h': [
        {
          'max-h': [
            'dialog',
            'sticky-aside',
            'banner',
            { dvh: [validators.isInteger], vh: [validators.isInteger] }
          ]
        }
      ],
      'max-w': [{ 'max-w': [{ vw: [validators.isInteger] }] }],
      w: [{ w: ['banner'] }],
      'grid-cols': [{ 'grid-cols': ['submit', 'meme-page'] }],
      rounded: [{ rounded: ['swatch'] }],
      'rounded-bl': [{ 'rounded-bl': ['banner'] }],
      'rounded-br': [{ 'rounded-br': ['banner'] }],
      pb: [{ pb: ['banner-safe'] }]
    }
  }
})

const DEFAULT_FETCH_TIMEOUT_MS = 15_000

const matchHasMessage = (value: unknown): value is { message: unknown } => {
  return typeof value === 'object' && value !== null && 'message' in value
}

const readErrorBodyMessage = async (response: Response) => {
  try {
    const errorBody: unknown = await response.json()

    return matchHasMessage(errorBody) ? String(errorBody.message) : null
  } catch {
    return null
  }
}

type FetchWithZodInit = RequestInit & {
  timeoutMs?: number
}

export async function fetchWithZod<TValue>(
  schema: ZodType<TValue>,
  input: Parameters<typeof fetch>[0],
  init?: FetchWithZodInit
): Promise<TValue> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...fetchInit } = init ?? {}
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal: controller.signal
    })

    if (!response.ok) {
      const statusMessage = `Fetch failed with status ${response.status}`
      const errorBodyMessage = await readErrorBodyMessage(response)
      const message =
        errorBodyMessage === null
          ? statusMessage
          : `${statusMessage}: ${errorBodyMessage}`

      logger.error({ url: input, status: response.status }, message)
      throw new Error(message)
    }

    const result: unknown = await response.json()

    logger.debug({ url: response.url }, 'Fetch response')

    return schema.parse(result, {
      reportInput: IS_DEVELOPMENT
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
