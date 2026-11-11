import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { waitUntil } from '@vercel/functions'
import { prismaClient } from '~/db/client.server'
import { getLocale } from '~/paraglide/runtime'
import { findFreshSession } from '~/server/auth/auth.server'

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await findFreshSession(getRequest().headers)

    if (!session) {
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
