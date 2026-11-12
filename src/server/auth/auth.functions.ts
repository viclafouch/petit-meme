import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { waitUntil } from '@vercel/functions'
import { getLocale } from '~/paraglide/runtime'
import { findFreshSession } from '~/server/auth/auth.server'
import { syncUserLocale } from '~/server/user/user.server'

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await findFreshSession(getRequest().headers)

    if (!session) {
      return null
    }

    waitUntil(syncUserLocale({ userId: session.user.id, locale: getLocale() }))

    return session.user
  }
)
