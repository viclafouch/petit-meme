import { createFileRoute } from '@tanstack/react-router'
import studioCss from '~/components/studio/studio.css?url'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildHomeJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listBookmarkIdsQueryOpts } from '~/queries/bookmark'
import { countLibraryMemesQueryOpts } from '~/queries/category'
import {
  countRecentMemesQueryOpts,
  listMemesQueryOpts,
  listTrendingMemesQueryOpts
} from '~/queries/meme'
import appPageCss from '~/routes/_public__root/app/-components/app-page.css?url'
import { HomePage } from './-components/home-page'
import homeCss from './-components/home.css?url'
import { NEW_MEMES_FILTERS } from './-lib/home'

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
      context.queryClient.query({
        ...listMemesQueryOpts(NEW_MEMES_FILTERS),
        staleTime: 'static'
      }),
      context.queryClient.query({
        ...countLibraryMemesQueryOpts(getLocale()),
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
    const seo = buildSeo({
      title: m.seo_home_title(),
      keywords: m.seo_home_keywords(),
      description: m.seo_home_description(),
      image: buildOgImage({ type: 'home', locale }, m.seo_home_title())
    })

    return {
      ...seo,
      links: [
        ...seo.links,
        { rel: 'stylesheet', href: homeCss },
        { rel: 'stylesheet', href: appPageCss },
        { rel: 'stylesheet', href: studioCss }
      ]
    }
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: serializeJsonLd(buildHomeJsonLd())
      }
    ]
  }
})
