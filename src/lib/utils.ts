import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ZodType } from 'zod'
import { IS_DEVELOPMENT } from '~/constants/env'
import { logger } from '~/lib/logger'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
