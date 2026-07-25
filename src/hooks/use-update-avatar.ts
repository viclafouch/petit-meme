import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { AvatarSelection } from '~/constants/avatar'
import { resolveAvatar } from '~/helpers/avatar'
import { matchIsRateLimitError } from '~/helpers/error'
import { authClient } from '~/lib/auth-client'
import { getAuthUserQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { updateUserAvatar } from '~/server/user'

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  const authUserQueryKey = getAuthUserQueryOpts().queryKey

  return useMutation({
    mutationFn: (selection: AvatarSelection) => {
      return updateUserAvatar({ data: selection })
    },
    onMutate: async (selection) => {
      await queryClient.cancelQueries({ queryKey: authUserQueryKey })

      const previousUser = queryClient.getQueryData(authUserQueryKey)

      if (previousUser) {
        const nextImage = resolveAvatar({
          selection,
          providerAvatar: previousUser.providerAvatar ?? null
        })

        queryClient.setQueryData(authUserQueryKey, (currentUser) => {
          if (!currentUser) {
            return currentUser
          }

          return { ...currentUser, image: nextImage ?? undefined }
        })
        await router.invalidate()
      }

      return { previousUser }
    },
    onError: async (error, _selection, context) => {
      captureWithFeature(error, 'update-avatar')
      toast.error(
        matchIsRateLimitError(error)
          ? m.settings_avatar_error_rate_limit()
          : m.settings_avatar_error()
      )

      if (context?.previousUser) {
        queryClient.setQueryData(authUserQueryKey, context.previousUser)
        await router.invalidate()
      }
    },
    onSuccess: async () => {
      const { data } = await authClient.getSession({
        query: { disableCookieCache: true }
      })

      if (data) {
        queryClient.setQueryData(authUserQueryKey, data.user)
      } else {
        await queryClient.invalidateQueries({ queryKey: authUserQueryKey })
      }

      await router.invalidate()
    }
  })
}
