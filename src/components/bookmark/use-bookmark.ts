import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { getAppErrorCode } from '~/constants/error'
import type { Meme } from '~/db/generated/prisma/client'
import { buildCapState } from '~/helpers/cap'
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
import { updateBookmark } from '~/server/bookmark/bookmark.functions'
import { useDialogStore } from '~/stores/dialog.store'

const UPDATE_BOOKMARK_MUTATION_KEY = ['update-bookmark'] as const

type UseBookmarkParams = {
  memeId: Meme['id']
  queryID?: string
  authenticatedUserToken?: string
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
    syncedQueryKeys: [listBookmarkIdsQueryOpts.all, getMemeQueryOpts.all],
    mutationFn: (nextIsBookmarked: boolean) => {
      return updateBookmark({
        data: { memeId, isBookmarked: nextIsBookmarked }
      })
    },
    onMutate: (nextIsBookmarked) => {
      queryClient.setQueryData(listBookmarkIdsQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        const others = old.filter((id) => {
          return id !== memeId
        })

        return nextIsBookmarked ? [memeId, ...others] : others
      })
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: listBookmarksQueryOpts.all,
        refetchType: 'none'
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

      if (errorCode === undefined) {
        captureWithFeature(error, 'bookmark')
      }
    }
  })

  const toggle = () => {
    if (!isSignedIn) {
      dialogStore.actions.showDialog('auth')

      return
    }

    if (isBookmarked) {
      updateMutation.mutate(false)

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
