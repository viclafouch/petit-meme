import { APIError } from 'better-auth'
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { RATE_LIMIT_VERIFY_EMAIL } from '~/constants/rate-limit'
import { auth } from '~/lib/auth'
import { verifyEmailWithPassword } from '~/lib/email-ownership'
import { authLogger } from '~/lib/logger'
import { createRateLimitMiddleware } from '~/server/rate-limit'

const VERIFY_EMAIL_SCHEMA = z.object({
  token: z.string(),
  password: z.string()
})

export const verifyEmail = createServerFn({ method: 'POST' })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_VERIFY_EMAIL)])
  .validator((data) => {
    return VERIFY_EMAIL_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const { headers } = getRequest()

    try {
      await verifyEmailWithPassword(auth, { ...data, headers })
    } catch (error) {
      if (!(error instanceof APIError)) {
        throw error
      }

      authLogger.warn({ code: error.body?.code }, 'Email verification refused')
      setResponseStatus(error.statusCode)
      throw new Error(error.body?.code ?? 'UNKNOWN', { cause: error })
    }
  })
