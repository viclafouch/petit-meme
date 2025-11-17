import { auth } from '@/lib/auth'
import { getAuthUser } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const getActiveSubscription = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthUser()

    if (!user) {
      return null
    }

    const request = getRequest()

    try {
      const subscriptions = await auth.api.listActiveSubscriptions({
        headers: request.headers,
        query: {
          referenceId: user.id
        }
      })

      const activeSubscription = subscriptions.find((sub) => {
        return sub.status === 'active' || sub.status === 'trialing'
      })

      return activeSubscription ?? null
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)

      return null
    }
  }
)

export type ActiveSubscription = NonNullable<
  Awaited<ReturnType<typeof getActiveSubscription>>
>
