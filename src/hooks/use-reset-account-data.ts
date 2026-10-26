import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { removePrivateQueries } from '~/lib/private-queries'

export const useResetAccountData = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return async () => {
    await removePrivateQueries(queryClient)
    await router.invalidate()
  }
}
