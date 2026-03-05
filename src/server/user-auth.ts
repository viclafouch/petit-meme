import { StudioError } from '@/constants/error'
import { prismaClient } from '@/db'
import { auth } from '@/lib/auth'
import { authLogger } from '@/lib/logger'
import { getLocale } from '@/paraglide/runtime'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { waitUntil } from '@vercel/functions'

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

  const session = await auth.api.getSession({ headers })

  if (!session) {
    authLogger.debug('Unauthenticated access attempt')
    setResponseStatus(401)
    throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
  }

  if (session.user.banned === true) {
    authLogger.warn({ userId: session.user.id }, 'Banned user access attempt')
    setResponseStatus(403)
    throw new StudioError('banned', { code: 'BANNED_USER' })
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
      setResponseStatus(401)
      throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
    }

    return next({ context: { user } })
  })
