import { toast } from 'sonner'
import {
  type InfiniteData,
  type QueryClient,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useMatchRoute, useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { getAppErrorCode } from '~/constants/error'
import type { Meme } from '~/db/generated/prisma/client'
import { buildCapState } from '~/helpers/cap'
import { getErrorMessage } from '~/helpers/error'
import { useSyncedMutation } from '~/hooks/use-synced-mutation'
import { sendConversionEvent } from '~/lib/algolia-insights'
import { snoozePremiumReminder } from '~/lib/premium-reminder'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import {
  listBookmarkIdsQueryOpts,
  listBookmarksQueryOpts
} from '~/queries/bookmark'
import { getMemeQueryOpts } from '~/queries/meme'
import {
  type listBookmarks,
  updateBookmark
} from '~/server/bookmark/bookmark.functions'
import { useDialogStore } from '~/stores/dialog.store'

const UPDATE_BOOKMARK_MUTATION_KEY = ['update-bookmark'] as const

type BookmarksPage = Awaited<ReturnType<typeof listBookmarks>>

type UseBookmarkParams = {
  memeId: Meme['id']
  queryID?: string
  authenticatedUserToken?: string
}

type ApplyBookmarkParams = {
  queryClient: QueryClient
  memeId: Meme['id']
  isBookmarked: boolean
}

const withoutMeme = (
  data: InfiniteData<BookmarksPage> | undefined,
  memeId: Meme['id']
) => {
  if (!data) {
    return data
  }

  return {
    ...data,
    pages: data.pages.map((page) => {
      const memes = page.memes.filter((meme) => {
        return meme.id !== memeId
      })

      return {
        ...page,
        memes,
        total: page.total - (page.memes.length - memes.length)
      }
    })
  }
}

const applyBookmark = ({
  queryClient,
  memeId,
  isBookmarked
}: ApplyBookmarkParams) => {
  queryClient.setQueryData(listBookmarkIdsQueryOpts().queryKey, (old) => {
    if (!old) {
      return old
    }

    const others = old.filter((id) => {
      return id !== memeId
    })

    return isBookmarked ? [memeId, ...others] : others
  })

  if (!isBookmarked) {
    queryClient.setQueryData(listBookmarksQueryOpts().queryKey, (old) => {
      return withoutMeme(old, memeId)
    })
  }
}

export const useBookmark = ({
  memeId,
  queryID,
  authenticatedUserToken
}: UseBookmarkParams) => {
  const { user } = useRouteContext({ from: '__root__' })
  const isSignedIn = Boolean(user)
  const queryClient = useQueryClient()
  const dialogStore = useDialogStore()
  const isPremium = useIsPremium()
  const matchRoute = useMatchRoute()
  const isOnBookmarksPage = Boolean(matchRoute({ to: '/memes/bookmarks' }))
  const isBookmarked =
    useQuery({
      ...listBookmarkIdsQueryOpts(),
      enabled: isSignedIn,
      select: (memeIds) => {
        return memeIds.includes(memeId)
      }
    }).data ?? false

  const openUpsell = () => {
    snoozePremiumReminder()
    dialogStore.actions.showDialog('bookmark-upsell')
  }

  const updateMutation = useSyncedMutation({
    mutationKey: UPDATE_BOOKMARK_MUTATION_KEY,
    scope: { id: `${UPDATE_BOOKMARK_MUTATION_KEY.join(':')}:${memeId}` },
    syncedQueryKeys: [
      listBookmarkIdsQueryOpts.all,
      listBookmarksQueryOpts.all,
      getMemeQueryOpts.all
    ],
    mutationFn: (nextIsBookmarked: boolean) => {
      return updateBookmark({
        data: { memeId, isBookmarked: nextIsBookmarked }
      })
    },
    onMutate: (nextIsBookmarked) => {
      applyBookmark({ queryClient, memeId, isBookmarked: nextIsBookmarked })
    },
    onError: (error) => {
      const errorCode = getAppErrorCode(error)

      if (errorCode === 'PREMIUM_REQUIRED') {
        openUpsell()

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
    }
  })

  const commitRemoval = () => {
    updateMutation.mutate(false)
  }

  const removeWithUndo = () => {
    const previousIds = queryClient.getQueryData(
      listBookmarkIdsQueryOpts().queryKey
    )
    const previousPages = queryClient.getQueryData(
      listBookmarksQueryOpts().queryKey
    )
    applyBookmark({ queryClient, memeId, isBookmarked: false })
    toast(m.bookmark_removed(), {
      onAutoClose: commitRemoval,
      onDismiss: commitRemoval,
      action: {
        label: m.common_undo(),
        onClick: () => {
          queryClient.setQueryData(
            listBookmarkIdsQueryOpts().queryKey,
            previousIds
          )
          queryClient.setQueryData(
            listBookmarksQueryOpts().queryKey,
            previousPages
          )
        }
      }
    })
  }

  const toggle = () => {
    if (!isSignedIn) {
      dialogStore.actions.showDialog('auth')

      return
    }

    if (isBookmarked) {
      if (isOnBookmarksPage) {
        removeWithUndo()

        return
      }

      commitRemoval()

      return
    }

    const { isReached } = buildCapState({
      kind: 'bookmark',
      usedCount:
        queryClient.getQueryData(listBookmarkIdsQueryOpts().queryKey)?.length ??
        0,
      isPremium
    })

    if (isReached) {
      openUpsell()

      return
    }

    sendConversionEvent({
      queryID,
      objectID: memeId,
      eventName: 'Meme Bookmarked',
      authenticatedUserToken
    })
    updateMutation.mutate(true)
  }

  return {
    isSignedIn,
    isBookmarked,
    label: isBookmarked ? m.meme_remove_bookmark() : m.meme_add_bookmark(),
    toggle
  }
}
