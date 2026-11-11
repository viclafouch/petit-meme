import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { snoozePremiumReminder } from '~/components/premium/use-premium-reminder'
import { getAppErrorCode } from '~/constants/error'
import type { MemeWithVideo } from '~/constants/meme'
import { FREE_PLAN_MAX_BOOKMARKS } from '~/constants/plan'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { getMemeQueryOpts } from '~/queries/meme'
import { toggleBookmark } from '~/server/bookmark/bookmark.functions'
import { dialogStore } from '~/stores/dialog.store'

type UseToggleBookmarkParams = {
  meme: MemeWithVideo
  bookmarks: MemeWithVideo[] | undefined
}

const openBookmarkUpsell = () => {
  snoozePremiumReminder()
  dialogStore.actions.showDialog('bookmark-upsell')
}

export function useToggleBookmark({
  meme,
  bookmarks
}: UseToggleBookmarkParams) {
  const queryClient = useQueryClient()
  const isPremium = useIsPremium()

  const isMemeBookmarked = React.useMemo(() => {
    if (!bookmarks) {
      return false
    }

    return bookmarks.some((bookmark) => {
      return bookmark.id === meme.id
    })
  }, [bookmarks, meme.id])

  const toggleMutation = useMutation({
    mutationFn: toggleBookmark,
    onMutate: async () => {
      const isBookmarkedAfterToggle = !isMemeBookmarked

      await queryClient.cancelQueries({
        queryKey: listBookmarkedMemesQueryOpts.all
      })

      queryClient.setQueryData(
        listBookmarkedMemesQueryOpts().queryKey,
        (old) => {
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
        }
      )
    },
    onError: (error) => {
      const errorCode = getAppErrorCode(error)

      if (errorCode === 'PREMIUM_REQUIRED') {
        openBookmarkUpsell()

        return
      }

      if (errorCode === 'UNAUTHORIZED') {
        dialogStore.actions.showDialog('auth')

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
        queryClient.invalidateQueries(getMemeQueryOpts(meme.id)),
        queryClient.invalidateQueries(listBookmarkedMemesQueryOpts())
      ])
    }
  })

  return {
    isMemeBookmarked,
    isPending: toggleMutation.isPending,
    toggleBookmark: () => {
      const isBookmarkCapReached =
        (bookmarks?.length ?? 0) >= FREE_PLAN_MAX_BOOKMARKS

      if (!isMemeBookmarked && !isPremium && isBookmarkCapReached) {
        openBookmarkUpsell()

        return
      }

      toggleMutation.mutate({ data: meme.id })
    }
  }
}
