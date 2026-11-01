import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getAppErrorCode } from '~/constants/error'
import type { MemeWithVideo } from '~/constants/meme'
import { FREE_PLAN_MAX_FAVORITES } from '~/constants/plan'
import { getErrorMessage } from '~/helpers/error'
import { useIsPremium } from '~/hooks/use-is-premium'
import { snoozePremiumReminder } from '~/hooks/use-premium-reminder'
import { useShowDialog } from '~/hooks/use-show-dialog'
import { getFavoritesMemesQueryOpts, getMemeByIdQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { toggleBookmarkByMemeId } from '~/server/user'

type UseToggleBookmarkParams = {
  meme: MemeWithVideo
  bookmarks: MemeWithVideo[] | undefined
}

export function useToggleBookmark({
  meme,
  bookmarks
}: UseToggleBookmarkParams) {
  const queryClient = useQueryClient()
  const showDialog = useShowDialog()
  const isPremium = useIsPremium()

  const openBookmarkUpsell = () => {
    snoozePremiumReminder()
    showDialog('bookmark-upsell', {})
  }

  const isMemeBookmarked = React.useMemo(() => {
    if (!bookmarks) {
      return false
    }

    return bookmarks.some((bookmark) => {
      return bookmark.id === meme.id
    })
  }, [bookmarks, meme.id])

  const toggleMutation = useMutation({
    mutationFn: toggleBookmarkByMemeId,
    onMutate: async () => {
      const isBookmarkedAfterToggle = !isMemeBookmarked

      await queryClient.cancelQueries({
        queryKey: getFavoritesMemesQueryOpts.all
      })

      queryClient.setQueryData(getFavoritesMemesQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        return isBookmarkedAfterToggle
          ? {
              bookmarks: [meme, ...old.bookmarks],
              count: old.count + 1
            }
          : {
              bookmarks: old.bookmarks.filter((bookmark) => {
                return bookmark.id !== meme.id
              }),
              count: old.count - 1
            }
      })
    },
    onError: (error) => {
      const errorCode = getAppErrorCode(error)

      if (errorCode === 'PREMIUM_REQUIRED') {
        openBookmarkUpsell()

        return
      }

      if (errorCode === 'UNAUTHORIZED') {
        showDialog('auth', {})

        return
      }

      if (errorCode !== undefined) {
        toast.error(getErrorMessage(error))

        return
      }

      captureWithFeature(error, 'bookmark')
      toast.error(m.error_bookmark_update())
    },
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries(getMemeByIdQueryOpts(meme.id)),
        queryClient.invalidateQueries(getFavoritesMemesQueryOpts())
      ])
    }
  })

  return {
    isMemeBookmarked,
    isPending: toggleMutation.isPending,
    toggleBookmark: () => {
      const isFavoritesFull =
        (bookmarks?.length ?? 0) >= FREE_PLAN_MAX_FAVORITES

      if (!isMemeBookmarked && !isPremium && isFavoritesFull) {
        openBookmarkUpsell()

        return
      }

      toggleMutation.mutate({ data: meme.id })
    }
  }
}
