import { createFileRoute } from '@tanstack/react-router'
import {
  getFavoritesMemesQueryOpts,
  getRecentCountMemesQueryOpts,
  getTrendingMemesQueryOpts
} from '~/lib/queries'
import { buildHomeJsonLd, buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { getHomeFaqItems } from './-components/faq-items'
import { HomePage } from './-components/home-page'

export const Route = createFileRoute('/_public__root/')({
  component: HomePage,
  pendingMs: 3000,
  head: () => {
    const locale = getLocale()
    const description = m.seo_home_description()

    return seo({
      title: m.seo_home_title(),
      keywords: m.seo_home_keywords(),
      description,
      image: buildOgImageUrl({
        type: 'home',
        locale
      }),
      imageAlt: m.seo_home_title()
    })
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          buildHomeJsonLd({ faqItems: getHomeFaqItems() })
        )
      }
    ]
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...getTrendingMemesQueryOpts(),
        staleTime: 'static'
      }),
      context.queryClient.query({
        ...getRecentCountMemesQueryOpts(),
        staleTime: 'static'
      }),
      context.user
        ? context.queryClient.query({
            ...getFavoritesMemesQueryOpts(),
            staleTime: 'static'
          })
        : undefined
    ])
  }
})
