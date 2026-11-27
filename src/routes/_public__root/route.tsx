import { createFileRoute } from '@tanstack/react-router'
import {
  ANNOUNCEMENT_BANNER_DISMISSAL,
  LOCALE_BANNER_DISMISSAL
} from '~/constants/banner'
import { isBannerDismissed } from '~/lib/banner-dismissal'
import { getLocaleSuggestion } from '~/lib/locale-suggestion'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import { listCategoriesQueryOpts } from '~/queries/category'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { PublicLayout } from './-components/public-layout'

export const Route = createFileRoute('/_public__root')({
  loader: async ({ context }) => {
    if (context.user) {
      void Promise.allSettled([
        context.queryClient.query({
          ...listBookmarkIdsQueryOpts(),
          staleTime: 'static'
        }),
        context.queryClient.query({
          ...getPremiumSubscriptionQueryOpts(),
          staleTime: 'static'
        })
      ])
    }

    await context.queryClient.query({
      ...listCategoriesQueryOpts(getLocale()),
      staleTime: 'static'
    })

    return {
      _suggestedLocale: isBannerDismissed(LOCALE_BANNER_DISMISSAL)
        ? null
        : getLocaleSuggestion(),
      _announcementDismissed: isBannerDismissed(ANNOUNCEMENT_BANNER_DISMISSAL)
    }
  },
  component: PublicLayout
})
