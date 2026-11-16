import { preload as preloadResource } from 'react-dom'
import type { QueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { clientEnv } from '~/env/client'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildVideoFirstFrameUrl } from '~/lib/bunny-public-urls'
import { getCrawlerStreamUrl } from '~/lib/crawler-video'
import { buildBreadcrumbJsonLd, buildMemeJsonLd } from '~/lib/seo/json-ld'
import { buildMemeSeo } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import {
  getMemePlaybackUrlQueryOpts,
  getMemeQueryOpts,
  listRelatedMemesQueryOpts
} from '~/queries/meme'
import { prefetchPublicPageQueries } from '~/routes/_public__root/-lib/prefetch-public-page-queries'
import { readSeenMemeIds } from '~/routes/_public__root/memes/-lib/seen-memes'
import { MemePage } from './-components/meme-page'
import memePageCss from './-components/meme-page.css?url'

const prefetchPlaybackUrl = createIsomorphicFn()
  .client((queryClient: QueryClient, memeId: string) => {
    void Promise.allSettled([
      queryClient.query(getMemePlaybackUrlQueryOpts(memeId))
    ])
  })
  .server(() => {})

const preloadFirstFrame = createIsomorphicFn()
  .client((bunnyId: string) => {
    preloadResource(buildVideoFirstFrameUrl(bunnyId), {
      as: 'image',
      fetchPriority: 'high'
    })
  })
  .server(() => {})

const buildMemePageLinks = () => {
  return [
    { rel: 'stylesheet', href: memePageCss },
    {
      rel: 'preconnect',
      href: `https://${clientEnv.VITE_BUNNY_IMAGES_HOSTNAME}`
    },
    {
      rel: 'preconnect',
      href: `https://${clientEnv.VITE_BUNNY_HOSTNAME}`,
      crossOrigin: 'anonymous' as const
    }
  ]
}

export const Route = createFileRoute('/_public__root/memes/$memeId')({
  component: MemePage,
  pendingMs: 1000,
  loader: async ({ params, context, preload, location }) => {
    prefetchPlaybackUrl(context.queryClient, params.memeId)
    prefetchPublicPageQueries({
      queryClient: context.queryClient,
      isSignedIn: Boolean(context.user)
    })

    const meme = await context.queryClient.query({
      ...getMemeQueryOpts(params.memeId),
      staleTime: 'static'
    })

    preloadFirstFrame(meme.video.bunnyId)

    if (!preload) {
      void Promise.allSettled([
        context.queryClient.query(
          listRelatedMemesQueryOpts({ memeId: meme.id, title: meme.title })
        )
      ])
    }

    const crawlerStreamUrl =
      meme.status === MemeStatus.PUBLISHED
        ? await getCrawlerStreamUrl(meme.video.bunnyId)
        : null

    return {
      meme,
      crawlerStreamUrl,
      seenMemeIds: readSeenMemeIds(location.state)
    }
  },
  scripts: ({ loaderData }) => {
    if (loaderData?.meme.status === MemeStatus.PUBLISHED) {
      const { meme } = loaderData
      const categoryName =
        meme.categories[0]?.category.title ?? m.meme_breadcrumb_fallback()
      const categorySlug = meme.categories[0]?.category.slug ?? 'all'

      return [
        {
          type: 'application/ld+json',
          children: serializeJsonLd(
            buildMemeJsonLd(meme, loaderData.crawlerStreamUrl)
          )
        },
        {
          type: 'application/ld+json',
          children: serializeJsonLd(
            buildBreadcrumbJsonLd([
              { name: m.meme_breadcrumb_home(), pathname: '/' },
              {
                name: categoryName,
                pathname: `/memes/category/${categorySlug}`
              },
              { name: meme.title, pathname: `/memes/${meme.id}` }
            ])
          )
        }
      ]
    }

    return []
  },
  head: ({ loaderData, match }) => {
    if (loaderData?.meme) {
      const seo = buildMemeSeo(loaderData.meme, {
        pathname: match.pathname,
        noindex: loaderData.meme.status !== MemeStatus.PUBLISHED
      })

      return {
        ...seo,
        links: [...seo.links, ...buildMemePageLinks()]
      }
    }

    return { links: buildMemePageLinks() }
  }
})
