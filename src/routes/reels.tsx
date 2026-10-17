import { createFileRoute } from '@tanstack/react-router'
import {
  getActiveSubscriptionQueryOpts,
  getInfiniteReelsQueryOpts
} from '~/lib/queries'
import { buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { ReelsPage, ReelsPending } from './-components/reels-page'

export const Route = createFileRoute('/reels')({
  component: ReelsPage,
  ssr: 'data-only',
  pendingComponent: ReelsPending,
  head: () => {
    const locale = getLocale()

    return seo({
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
  },
  loader: async ({ context }) => {
    if (context.user) {
      void Promise.allSettled([
        context.queryClient.query({
          ...getActiveSubscriptionQueryOpts(),
          staleTime: 'static'
        })
      ])
    }

    await context.queryClient.infiniteQuery({
      ...getInfiniteReelsQueryOpts(),
      staleTime: 'static'
    })
  }
})
