import type { Request, Response } from '@playwright/test'

export const SERVER_FUNCTION_URL_PATTERN = /\/_serverFn\//u

export const matchIsServerFunctionRequest = (request: Request) => {
  return (
    request.method() === 'POST' &&
    SERVER_FUNCTION_URL_PATTERN.test(request.url())
  )
}

export const matchIsServerFunctionCall = (response: Response) => {
  return matchIsServerFunctionRequest(response.request())
}
