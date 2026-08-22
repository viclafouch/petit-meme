import type { Response } from '@playwright/test'

const SERVER_FUNCTION_BASE = '/_serverFn/'

// A server function URL carries a hash of its body, nothing readable to match on.
export const matchIsServerFunctionCall = (response: Response) => {
  return (
    response.request().method() === 'POST' &&
    response.url().includes(SERVER_FUNCTION_BASE)
  )
}
