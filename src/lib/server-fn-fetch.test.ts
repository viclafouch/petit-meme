import { afterEach, describe, expect, it, vi } from 'vitest'
import { X_TSS_SERIALIZED } from '@tanstack/react-start'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { serverFnFetch } from '~/lib/server-fn-fetch'

const SERVER_FN_URL = '/_serverFn/abc'

const RATE_LIMIT_ERROR = new AppError('rate_limited', { code: 'RATE_LIMITED' })

const stubFetchResponse = (response: Response) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return response
    })
  )
}

describe('serverFnFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should turn a plain text 429 from the edge into a rate limit AppError', async () => {
    stubFetchResponse(
      new Response('Too Many Requests\n\nToo Many Requests\ncdg1::abc', {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: { 'content-type': 'text/plain' }
      })
    )

    await expect(serverFnFetch(SERVER_FN_URL)).rejects.toStrictEqual(
      RATE_LIMIT_ERROR
    )
  })

  it('should turn a JSON 429 from the edge into a rate limit AppError', async () => {
    stubFetchResponse(
      Response.json(
        {
          error: {
            code: '429',
            message: 'Too Many Requests',
            id: 'cdg1::abc'
          }
        },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      )
    )

    await expect(serverFnFetch(SERVER_FN_URL)).rejects.toStrictEqual(
      RATE_LIMIT_ERROR
    )
  })

  it('should hand over a 429 serialized by a server function untouched', async () => {
    const response = Response.json(
      {},
      {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: { [X_TSS_SERIALIZED]: 'true' }
      }
    )
    stubFetchResponse(response)

    await expect(serverFnFetch(SERVER_FN_URL)).resolves.toBe(response)
  })

  it('should hand over a successful response untouched', async () => {
    const response = new Response('ok', { status: HTTP_STATUS.OK })
    stubFetchResponse(response)

    await expect(serverFnFetch(SERVER_FN_URL)).resolves.toBe(response)
  })
})
