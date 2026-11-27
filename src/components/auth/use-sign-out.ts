import { toast } from 'sonner'
import { useResetAccountData } from '~/components/auth/use-reset-account-data'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'

export const useSignOut = () => {
  const resetAccountData = useResetAccountData()

  const signOut = async () => {
    try {
      const { authClient } = await import('~/lib/auth-client')

      await authClient.signOut()
      await resetAccountData()
    } catch (error) {
      captureWithFeature(error, 'sign-out')
      toast.error(m.error_sign_out())
    }
  }

  return { signOut }
}
