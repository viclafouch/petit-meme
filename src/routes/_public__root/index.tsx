import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { renderJsonLdScripts } from '~/lib/seo/page-json-ld'
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
import { HomePage } from './-components/home-page'
import homeCss from './-components/home.css?url'
import { NEW_MEMES_FILTERS } from './-lib/home'
import { getHomeJsonLd } from './-lib/home-json-ld'

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

    return { jsonLd: getHomeJsonLd() }
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
      links: [...seo.links, { rel: 'stylesheet', href: homeCss }]
    }
  },
  scripts: renderJsonLdScripts
})
