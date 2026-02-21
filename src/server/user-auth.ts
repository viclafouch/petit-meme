import type { UserWithRole } from 'better-auth/plugins'
import { StudioError } from '@/constants/error'
import { auth } from '@/lib/auth'
import { authLogger } from '@/lib/logger'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { headers } = getRequest()
    const session = await auth.api.getSession({ headers })

    return (session?.user as UserWithRole | undefined) || null
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
