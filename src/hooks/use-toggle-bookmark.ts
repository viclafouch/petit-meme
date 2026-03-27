import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudioErrorCode } from '~/constants/error'
import type { MemeWithVideo } from '~/constants/meme'
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
      const newValue = !isMemeBookmarked

      await queryClient.cancelQueries({
        queryKey: getFavoritesMemesQueryOpts.all
      })

      queryClient.setQueryData(getFavoritesMemesQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        if (!newValue) {
          return {
            bookmarks: old.bookmarks.filter((bookmark) => {
              return bookmark.id !== meme.id
            }),
            count: old.count - 1
          }
        }

        return {
          bookmarks: [meme, ...old.bookmarks],
          count: old.count + 1
        }
      })
    },
    onError: (error) => {
      if (getStudioErrorCode(error) === 'PREMIUM_REQUIRED') {
        toast.error(m.error_bookmark_limit())

        return
      }

      captureWithFeature(error, 'bookmark')
      toast.error(m.error_bookmark_update())
    },
    onSettled: () => {
      void queryClient.invalidateQueries(getMemeByIdQueryOpts(meme.id))
      void queryClient.invalidateQueries(getFavoritesMemesQueryOpts())
    }
  })

  return {
    isMemeBookmarked,
    isPending: toggleMutation.isPending,
    toggleBookmark: () => {
      toggleMutation.mutate({ data: meme.id })
    }
  }
}
