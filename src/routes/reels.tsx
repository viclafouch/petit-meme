import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listReelsQueryOpts } from '~/queries/meme'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { ReelsPage, ReelsPending } from './-components/reels-page'

export const Route = createFileRoute('/reels')({
  component: ReelsPage,
  ssr: 'data-only',
  pendingComponent: ReelsPending,
  loader: async ({ context }) => {
    if (context.user) {
      void Promise.allSettled([
        context.queryClient.query({
          ...getPremiumSubscriptionQueryOpts(),
          staleTime: 'static'
        })
      ])
    }

    await context.queryClient.infiniteQuery({
      ...listReelsQueryOpts(),
      staleTime: 'static'
    })
  },
  head: () => {
    const locale = getLocale()

    return buildSeo({
      title: m.seo_reels_title(),
      pathname: '/reels',
      description: m.meme_seo_library_description(),
      image: buildOgImageUrl({
        type: 'reels',
        subtitle: m.meme_seo_library_description(),
        locale
      }),
      imageAlt: m.seo_reels_title()
    })
  }
})
