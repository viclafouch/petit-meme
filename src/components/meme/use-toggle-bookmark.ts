import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { getAppErrorCode } from '~/constants/error'
import type { MemeWithVideo } from '~/constants/meme'
import { buildCapState } from '~/helpers/cap'
import { getErrorMessage } from '~/helpers/error'
import { snoozePremiumReminder } from '~/lib/premium-reminder'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { getMemeQueryOpts } from '~/queries/meme'
import { toggleBookmark } from '~/server/bookmark/bookmark.functions'
import { useDialogStore } from '~/stores/dialog.store'

const TOGGLE_BOOKMARK_MUTATION_KEY = ['toggle-bookmark'] as const

type UseToggleBookmarkParams = {
  meme: MemeWithVideo
  bookmarks: MemeWithVideo[] | undefined
}

export function useToggleBookmark({
  meme,
  bookmarks
}: UseToggleBookmarkParams) {
  const dialogStore = useDialogStore()
  const queryClient = useQueryClient()
  const isPremium = useIsPremium()

  const openBookmarkUpsell = () => {
    snoozePremiumReminder()
    dialogStore.actions.showDialog('bookmark-upsell')
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
    mutationKey: [...TOGGLE_BOOKMARK_MUTATION_KEY, meme.id],
    scope: { id: `toggle-bookmark:${meme.id}` },
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
      const isLastToggleOfMeme =
        queryClient.isMutating({
          mutationKey: [...TOGGLE_BOOKMARK_MUTATION_KEY, meme.id]
        }) === 1
      const isLastToggle =
        queryClient.isMutating({
          mutationKey: TOGGLE_BOOKMARK_MUTATION_KEY
        }) === 1

      return Promise.all([
        isLastToggleOfMeme
          ? queryClient.invalidateQueries(getMemeQueryOpts(meme.id))
          : null,
        isLastToggle
          ? queryClient.invalidateQueries(listBookmarkedMemesQueryOpts())
          : null
      ])
    }
  })

  return {
    isMemeBookmarked,
    isPending: toggleMutation.isPending,
    toggleBookmark: () => {
      const { isReached } = buildCapState({
        kind: 'bookmark',
        usedCount: bookmarks?.length ?? 0,
        isPremium
      })

      if (!isMemeBookmarked && isReached) {
        openBookmarkUpsell()

        return
      }

      toggleMutation.mutate({ data: meme.id })
    }
  }
}
