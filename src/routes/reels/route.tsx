import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import { listReelsQueryOpts } from '~/queries/meme'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { ReelsPage } from './-components/reels-page'

export const Route = createFileRoute('/reels')({
  component: ReelsPage,
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

    await context.queryClient.infiniteQuery(listReelsQueryOpts())

    return {
      jsonLd: getBreadcrumbJsonLd([
        { name: m.seo_reels_title(), pathname: '/reels' }
      ])
    }
  },
  scripts: renderJsonLdScripts,
  head: () => {
    const locale = getLocale()

    return buildSeo({
      title: m.seo_reels_title(),
      pathname: '/reels',
      description: m.meme_seo_library_description(),
      image: buildOgImage(
        {
          type: 'reels',
          subtitle: m.meme_seo_library_description(),
          locale
        },
        m.seo_reels_title()
      )
    })
  }
})
