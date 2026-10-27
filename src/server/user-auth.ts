import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { waitUntil } from '@vercel/functions'
import { prismaClient } from '~/db'
import { StudioError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { auth } from '~/lib/auth'
import { authLogger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { headers } = getRequest()
    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      return null
    }

    const locale = getLocale()

    waitUntil(
      prismaClient.user.updateMany({
        where: { id: session.user.id, NOT: { locale } },
        data: { locale }
      })
    )

    return session.user
  }
)

export const authUserRequiredMiddleware = createMiddleware({
  type: 'function'
}).server(async ({ next }) => {
  const { headers } = getRequest()

  const session = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true }
  })

  if (!session) {
    authLogger.debug('Unauthenticated access attempt')
    setResponseStatus(HTTP_STATUS.UNAUTHORIZED)
    throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
  }

  if (session.user.banned === true) {
    authLogger.warn({ userId: session.user.id }, 'Banned user access attempt')
    setResponseStatus(HTTP_STATUS.FORBIDDEN)
    throw new StudioError('banned_user', { code: 'BANNED_USER' })
  }

  return next({ context: { user: session.user } })
})

export const adminRequiredMiddleware = createMiddleware({
  type: 'function'
})
  .middleware([authUserRequiredMiddleware])
  .server(async ({ context, next }) => {
    const { user } = context

    if (user.role !== 'admin') {
      authLogger.warn({ userId: user.id }, 'Non-admin access attempt')
      setResponseStatus(HTTP_STATUS.UNAUTHORIZED)
      throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
    }

    return next({ context: { user } })
  })
