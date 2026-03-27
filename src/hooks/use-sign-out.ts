import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'

export const useSignOut = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = async () => {
    try {
      await authClient.signOut()
      queryClient.removeQueries(getAuthUserQueryOpts())
      queryClient.removeQueries(getActiveSubscriptionQueryOpts())
      queryClient.removeQueries(getFavoritesMemesQueryOpts())
      await router.invalidate()
    } catch (error) {
      captureWithFeature(error, 'sign-out')
      toast.error(m.error_sign_out())
    }
  }

  return { signOut }
}
