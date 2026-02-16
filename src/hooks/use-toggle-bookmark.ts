import React from 'react'
import type { MemeWithVideo } from '@/constants/meme'
import { getFavoritesMemesQueryOpts, getMemeByIdQueryOpts } from '@/lib/queries'
import { toggleBookmarkByMemeId } from '@/server/user'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type UseToggleBookmarkParams = {
  meme: MemeWithVideo
  bookmarks: MemeWithVideo[] | undefined
}

export function useToggleBookmark({
  meme,
  bookmarks
}: UseToggleBookmarkParams) {
  const queryClient = useQueryClient()

  // eslint-disable-next-line no-restricted-syntax
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
