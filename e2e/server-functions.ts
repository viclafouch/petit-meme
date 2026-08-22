import type { Response } from '@playwright/test'

// A server function URL carries a hash of its body, nothing readable to match on.
export const SERVER_FUNCTION_URL_PATTERN = /\/_serverFn\//u

export const matchIsServerFunctionCall = (response: Response) => {
  return (
    response.request().method() === 'POST' &&
    SERVER_FUNCTION_URL_PATTERN.test(response.url())
  )
}
