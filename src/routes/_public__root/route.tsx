import { createFileRoute } from '@tanstack/react-router'
import {
  ANNOUNCEMENT_BANNER_DISMISSAL,
  LOCALE_BANNER_DISMISSAL
} from '~/constants/banner'
import { isBannerDismissed } from '~/lib/banner-dismissal'
import { getLocaleSuggestion } from '~/lib/locale-suggestion'
import { listMemesQueryOpts } from '~/queries/meme'
import { PublicLayout } from './-components/public-layout'

export const Route = createFileRoute('/_public__root')({
  loader: ({ context }) => {
    void Promise.allSettled([context.queryClient.query(listMemesQueryOpts({}))])

    return {
      _suggestedLocale: isBannerDismissed(LOCALE_BANNER_DISMISSAL)
        ? null
        : getLocaleSuggestion(),
      _announcementDismissed: isBannerDismissed(ANNOUNCEMENT_BANNER_DISMISSAL)
    }
  },
  component: PublicLayout
})
