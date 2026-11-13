import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useToggleBookmark } from '~/components/meme/use-toggle-bookmark'
import type { MemeWithVideo } from '~/constants/meme'
import { sendConversionEvent } from '~/lib/algolia-insights'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { useDialogStore } from '~/stores/dialog.store'

type UseBookmarkActionParams = {
  meme: MemeWithVideo
  queryID?: string
  authenticatedUserToken?: string
}

export const useBookmarkAction = ({
  meme,
  queryID,
  authenticatedUserToken
}: UseBookmarkActionParams) => {
  const { user } = useRouteContext({ from: '__root__' })
  const dialogStore = useDialogStore()
  const bookmarkedMemesQuery = useQuery({
    ...listBookmarkedMemesQueryOpts(),
    enabled: Boolean(user)
  })
  const { isMemeBookmarked, isPending, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: bookmarkedMemesQuery.data?.bookmarks
  })

  const selectBookmark = () => {
    if (!user) {
      dialogStore.actions.showDialog('auth')

      return
    }

    if (!isMemeBookmarked) {
      sendConversionEvent({
        queryID,
        objectID: meme.id,
        eventName: 'Meme Bookmarked',
        authenticatedUserToken
      })
    }

    toggleBookmark()
  }

  return {
    isMemeBookmarked,
    isPending,
    label: isMemeBookmarked ? m.meme_remove_bookmark() : m.meme_add_bookmark(),
    selectBookmark
  }
}
