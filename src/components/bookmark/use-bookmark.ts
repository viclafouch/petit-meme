import { toast } from 'sonner'
import {
  type InfiniteData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useMatchRoute, useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { getAppErrorCode } from '~/constants/error'
import type { Meme } from '~/db/generated/prisma/client'
import { buildCapState } from '~/helpers/cap'
import { getErrorMessage } from '~/helpers/error'
import { sendConversionEvent } from '~/lib/algolia-insights'
import { snoozePremiumReminder } from '~/lib/premium-reminder'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import {
  bookmarkQueryKey,
  listBookmarkIdsQueryOpts,
  listBookmarksQueryOpts
} from '~/queries/bookmark'
import { getMemeQueryOpts } from '~/queries/meme'
import {
  type listBookmarks,
  toggleBookmark
} from '~/server/bookmark/bookmark.functions'
import { useDialogStore } from '~/stores/dialog.store'

const TOGGLE_BOOKMARK_MUTATION_KEY = ['toggle-bookmark'] as const

type BookmarksPage = Awaited<ReturnType<typeof listBookmarks>>

type UseBookmarkParams = {
  memeId: Meme['id']
  queryID?: string
  authenticatedUserToken?: string
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
  const isBookmarkedQuery = useQuery({
    ...listBookmarkIdsQueryOpts(),
    enabled: isSignedIn,
    select: (memeIds) => {
      return memeIds.includes(memeId)
    }
  })
  const isBookmarked = isBookmarkedQuery.data ?? false

  const readBookmarkIds = () => {
    return queryClient.getQueryData(listBookmarkIdsQueryOpts().queryKey) ?? []
  }

  const openUpsell = () => {
    snoozePremiumReminder()
    dialogStore.actions.showDialog('bookmark-upsell')
  }

  const toggleMutation = useMutation({
    mutationKey: [...TOGGLE_BOOKMARK_MUTATION_KEY, memeId],
    scope: { id: `toggle-bookmark:${memeId}` },
    mutationFn: toggleBookmark,
    onMutate: async () => {
      const isAdding = !readBookmarkIds().includes(memeId)

      await queryClient.cancelQueries({ queryKey: bookmarkQueryKey })

      queryClient.setQueryData(listBookmarkIdsQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        const others = old.filter((id) => {
          return id !== memeId
        })

        return isAdding ? [memeId, ...others] : others
      })

      if (!isAdding) {
        queryClient.setQueryData(listBookmarksQueryOpts().queryKey, (old) => {
          return withoutMeme(old, memeId)
        })
      }

      return { isAdding }
    },
    onSuccess: (_result, _variables, context) => {
      if (context.isAdding || !isOnBookmarksPage) {
        return
      }

      toast(m.bookmark_removed(), {
        action: {
          label: m.common_undo(),
          onClick: () => {
            toggleMutation.mutate({ data: memeId })
          }
        }
      })
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
    },
    onSettled: () => {
      const isLastToggleOfMeme =
        queryClient.isMutating({
          mutationKey: [...TOGGLE_BOOKMARK_MUTATION_KEY, memeId]
        }) === 1
      const isLastToggle =
        queryClient.isMutating({
          mutationKey: TOGGLE_BOOKMARK_MUTATION_KEY
        }) === 1

      return Promise.all([
        isLastToggleOfMeme
          ? queryClient.invalidateQueries(getMemeQueryOpts(memeId))
          : null,
        isLastToggle
          ? queryClient.invalidateQueries({ queryKey: bookmarkQueryKey })
          : null
      ])
    }
  })

  const toggle = () => {
    if (!isSignedIn) {
      dialogStore.actions.showDialog('auth')

      return
    }

    if (!isBookmarked) {
      const { isReached } = buildCapState({
        kind: 'bookmark',
        usedCount: readBookmarkIds().length,
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
    }

    toggleMutation.mutate({ data: memeId })
  }

  return {
    isSignedIn,
    isBookmarked,
    isPending: toggleMutation.isPending,
    label: isBookmarked ? m.meme_remove_bookmark() : m.meme_add_bookmark(),
    toggle
  }
}
