import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { findFreshSession } from '~/server/auth/auth.server'
import { findPremiumSubscription } from '~/server/subscription/subscription.server'

export const getPremiumSubscription = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await findFreshSession(getRequest().headers)

    if (!session) {
      return null
    }

    return findPremiumSubscription(session.user.id)
  }
)

export type PremiumSubscription = NonNullable<
  Awaited<ReturnType<typeof getPremiumSubscription>>
>
