import { toast } from 'sonner'
import { useResetAccountData } from '~/hooks/use-reset-account-data'
import { authClient } from '~/lib/auth-client'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'

export const useSignOut = () => {
  const resetAccountData = useResetAccountData()

  const signOut = async () => {
    try {
      await authClient.signOut()
      await resetAccountData()
    } catch (error) {
      captureWithFeature(error, 'sign-out')
      toast.error(m.error_sign_out())
    }
  }

  return { signOut }
}
