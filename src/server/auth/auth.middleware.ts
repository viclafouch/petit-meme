import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { authLogger } from '~/lib/logger'
import { matchIsUserAdmin, matchIsUserBanned } from '~/lib/role'
import { wrapMiddlewareWithSentry } from '~/lib/sentry'
import { findFreshSession } from '~/server/auth/auth.server'
import { throwWithStatus } from '~/server/http/http.server'

export const userRequiredMiddleware = wrapMiddlewareWithSentry(
  'userRequiredMiddleware',
  createMiddleware({
    type: 'function'
  }).server(async ({ next }) => {
    const session = await findFreshSession(getRequest().headers)

    if (!session) {
      authLogger.debug('Unauthenticated access attempt')

      return throwWithStatus(
        HTTP_STATUS.UNAUTHORIZED,
        new AppError('unauthorized', { code: 'UNAUTHORIZED' })
      )
    }

    if (matchIsUserBanned(session.user)) {
      authLogger.warn({ userId: session.user.id }, 'Banned user access attempt')

      return throwWithStatus(
        HTTP_STATUS.FORBIDDEN,
        new AppError('banned_user', { code: 'BANNED_USER' })
      )
    }

    return next({ context: { user: session.user } })
  })
)

export const adminRequiredMiddleware = wrapMiddlewareWithSentry(
  'adminRequiredMiddleware',
  createMiddleware({
    type: 'function'
  })
    .middleware([userRequiredMiddleware])
    .server(async ({ context, next }) => {
      const { user } = context

      if (!matchIsUserAdmin(user)) {
        authLogger.warn({ userId: user.id }, 'Non-admin access attempt')

        return throwWithStatus(
          HTTP_STATUS.UNAUTHORIZED,
          new AppError('unauthorized', { code: 'UNAUTHORIZED' })
        )
      }

      return next({ context: { user } })
    })
)
