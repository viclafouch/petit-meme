import { describe, expect, it } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { verifyCronSecret } from '~/utils/cron-auth'

const CRON_SECRET = 'cron-auth-test-secret-0001'

const createCronRequest = (authorization?: string) => {
  const headers = new Headers()

  if (authorization) {
    headers.set('authorization', authorization)
  }

  return new Request('http://localhost/api/cron/cleanup', { headers })
}

describe('verifyCronSecret', () => {
  it('should let the request through with the secret as bearer', () => {
    const request = createCronRequest(`Bearer ${CRON_SECRET}`)

    expect(verifyCronSecret({ request, secret: CRON_SECRET })).toBeNull()
  })

  it('should answer 401 without an authorization header', () => {
    const request = createCronRequest()

    expect(verifyCronSecret({ request, secret: CRON_SECRET })?.status).toBe(
      HTTP_STATUS.UNAUTHORIZED
    )
  })

  it('should answer 401 with another bearer', () => {
    const request = createCronRequest('Bearer not-the-secret')

    expect(verifyCronSecret({ request, secret: CRON_SECRET })?.status).toBe(
      HTTP_STATUS.UNAUTHORIZED
    )
  })

  it('should answer 401 when CRON_SECRET is missing', () => {
    const request = createCronRequest()

    expect(verifyCronSecret({ request, secret: undefined })?.status).toBe(
      HTTP_STATUS.UNAUTHORIZED
    )
  })

  it('should answer 401 to "Bearer undefined" when CRON_SECRET is missing', () => {
    const request = createCronRequest('Bearer undefined')

    expect(verifyCronSecret({ request, secret: undefined })?.status).toBe(
      HTTP_STATUS.UNAUTHORIZED
    )
  })
})
