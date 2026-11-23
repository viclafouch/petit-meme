import { createFileRoute } from '@tanstack/react-router'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildHomeJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import {
  countRecentMemesQueryOpts,
  listTrendingMemesQueryOpts
} from '~/queries/meme'
import { getHomeFaqItems } from './-components/faq-items'
import { HomePage } from './-components/home-page'

export const Route = createFileRoute('/_public__root/')({
  component: HomePage,
  pendingMs: 3000,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...listTrendingMemesQueryOpts(),
        staleTime: 'static'
      }),
      context.queryClient.query({
        ...countRecentMemesQueryOpts(),
        staleTime: 'static'
      }),
      context.user
        ? context.queryClient.query({
            ...listBookmarkIdsQueryOpts(),
            staleTime: 'static'
          })
        : undefined
    ])
  },
  head: () => {
    const locale = getLocale()
    const description = m.seo_home_description()

    return buildSeo({
      title: m.seo_home_title(),
      keywords: m.seo_home_keywords(),
      description,
      image: buildOgImage(
        {
          type: 'home',
          locale
        },
        m.seo_home_title()
      )
    })
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: serializeJsonLd(
          buildHomeJsonLd({ faqItems: getHomeFaqItems() })
        )
      }
    ]
  }
})
