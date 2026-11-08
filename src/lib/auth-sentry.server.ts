import { createAuthMiddleware } from 'better-auth/api'
import { z } from 'zod'
import * as Sentry from '@sentry/tanstackstart-react'

const GET_SESSION_RESPONSE_SCHEMA = z.object({
  user: z.object({ id: z.string() })
})

export const identifySentryUser = createAuthMiddleware(
  async (endpointContext) => {
    const { newSession, session, returned } = endpointContext.context
    const knownSession = newSession ?? session

    if (knownSession) {
      Sentry.setUser({ id: knownSession.user.id })

      return
    }

    if (endpointContext.path !== '/get-session') {
      return
    }

    const response = GET_SESSION_RESPONSE_SCHEMA.safeParse(returned)

    if (response.success) {
      Sentry.setUser({ id: response.data.user.id })
    }
  }
)
