import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ZodType } from 'zod'
import { logger } from '~/lib/logger'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FieldMeta = {
  isTouched: boolean
  isValid: boolean
  errors: ({ message: string } | undefined)[]
}

export type FormFieldApi<T> = {
  state: {
    value: T
    meta: FieldMeta
  }
  name: string
  handleBlur: () => void
  handleChange: (value: T) => void
}

export function getFieldErrorMessage<T>({ field }: { field: FormFieldApi<T> }) {
  return field.state.meta.isTouched && !field.state.meta.isValid
    ? (field.state.meta.errors[0]?.message ?? '')
    : ''
}

const DEFAULT_FETCH_TIMEOUT_MS = 15_000

type FetchWithZodInit = RequestInit & {
  timeoutMs?: number
}

export async function fetchWithZod<T>(
  schema: ZodType<T>,
  input: Parameters<typeof fetch>[0],
  init?: FetchWithZodInit
): Promise<T> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...fetchInit } = init ?? {}
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    return controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal: controller.signal
    })

    if (!response.ok) {
      let message = `Fetch failed with status ${response.status}`

      try {
        const error = await response.json()
        message = `${message}: ${error.message}`
      } catch {}

      logger.error({ url: input, status: response.status }, message)
      throw new Error(message)
    }

    const result = await response.json()

    logger.debug({ url: response.url }, 'Fetch response')

    return schema.parse(result, {
      reportInput: process.env.NODE_ENV === 'development'
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
