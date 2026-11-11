import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { findFreshSession } from '~/server/auth/auth.server'
import { findActiveSubscription } from '~/server/subscription/subscription.server'

export const getActiveSubscription = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await findFreshSession(getRequest().headers)

    if (!session) {
      return null
    }

    return findActiveSubscription(session.user.id)
  }
)

export type ActiveSubscription = NonNullable<
  Awaited<ReturnType<typeof getActiveSubscription>>
>
