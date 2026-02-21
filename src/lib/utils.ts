import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ZodType } from 'zod'
import { logger } from '@/lib/logger'
import type { AnyFieldApi } from '@tanstack/react-form'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFieldErrorMessage({ field }: { field: AnyFieldApi }) {
  return field.state.meta.isTouched && !field.state.meta.isValid
    ? field.state.meta.errors[0].message
    : ''
}

export async function fetchWithZod<T>(
  schema: ZodType<T>,
  ...args: Parameters<typeof fetch>
): Promise<T> {
  const response = await fetch(...args)

  if (!response.ok) {
    let message = `Fetch failed with status ${response.status}`

    try {
      const error = await response.json()
      message = `${message}: ${error.message}`
    } catch {}

    logger.error({ url: args[0], status: response.status }, message)
    throw new Error(message)
  }

  const result = await response.json()

  logger.debug({ url: response.url }, 'Fetch response')

  return schema.parse(result, {
    reportInput: process.env.NODE_ENV === 'development'
  })
}
