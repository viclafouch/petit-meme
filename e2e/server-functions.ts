import type { Page, Request, Response } from '@playwright/test'
import { repeatUntilRequested } from './hydration'

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

export const cutServerFunctionCalls = (page: Page) => {
  return page.route(SERVER_FUNCTION_URL_PATTERN, (route) => {
    if (!matchIsServerFunctionRequest(route.request())) {
      return route.fallback()
    }

    return route.abort('internetdisconnected')
  })
}

type ServerFunctionCall = {
  url: string
  headers: ReturnType<Request['headers']>
  body: string
}

export const holdServerFunctionCall = async (
  page: Page,
  act: () => Promise<void>
) => {
  const { promise, resolve } = Promise.withResolvers<ServerFunctionCall>()

  await page.route(SERVER_FUNCTION_URL_PATTERN, (route) => {
    const request = route.request()

    if (request.method() !== 'POST') {
      return route.fallback()
    }

    resolve({
      url: request.url(),
      headers: request.headers(),
      body: request.postData() ?? ''
    })
  })

  await repeatUntilRequested(act, {
    page,
    urlPattern: SERVER_FUNCTION_URL_PATTERN
  })

  return promise
}

type SendServerFunctionCallsAtOnceParams = {
  page: Page
  call: ServerFunctionCall
  bodies: readonly string[]
  clientIp: string
}

export const sendServerFunctionCallsAtOnce = async ({
  page,
  call,
  bodies,
  clientIp
}: SendServerFunctionCallsAtOnceParams) => {
  const responses = await Promise.all(
    bodies.map((body) => {
      return page.request.post(call.url, {
        headers: { ...call.headers, 'x-real-ip': clientIp },
        data: body
      })
    })
  )

  return responses
    .map((response) => {
      return response.status()
    })
    .toSorted((left, right) => {
      return left - right
    })
}

export const repeat = <TValue>(value: TValue, count: number) => {
  return Array.from({ length: count }, () => {
    return value
  })
}
