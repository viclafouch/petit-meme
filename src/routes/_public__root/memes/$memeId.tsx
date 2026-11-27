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
import { warmVideoStream } from '~/lib/video'
import { m } from '~/paraglide/messages'
import {
  getMemePlaybackUrlQueryOpts,
  getMemeQueryOpts,
  getMemeWithPlaybackUrlQueryOpts,
  listRelatedMemesQueryOpts
} from '~/queries/meme'
import { readSeenMemeIds } from '~/routes/_public__root/memes/-lib/seen-memes'
import { MemePage } from './-components/meme-page'
import memePageCss from './-components/meme-page.css?url'

type MemeLoaderParams = {
  queryClient: QueryClient
  memeId: string
  isPreload: boolean
}

const warmPlayback = async ({
  queryClient,
  memeId,
  isPreload
}: MemeLoaderParams) => {
  const playbackUrl = await queryClient.query(
    getMemePlaybackUrlQueryOpts(memeId)
  )

  if (isPreload) {
    warmVideoStream(playbackUrl)
  }
}

const queryMeme = createIsomorphicFn()
  .server(({ queryClient, memeId }: MemeLoaderParams) => {
    return queryClient.query({
      ...getMemeQueryOpts(memeId),
      staleTime: 'static'
    })
  })
  .client(async ({ queryClient, memeId, isPreload }: MemeLoaderParams) => {
    const meme = await queryClient.query({
      ...getMemeWithPlaybackUrlQueryOpts(memeId),
      staleTime: 'static'
    })

    preloadResource(buildVideoFirstFrameUrl(meme.video.bunnyId), {
      as: 'image',
      fetchPriority: 'high'
    })

    void Promise.allSettled([warmPlayback({ queryClient, memeId, isPreload })])

    return meme
  })

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
    const meme = await queryMeme({
      queryClient: context.queryClient,
      memeId: params.memeId,
      isPreload: preload
    })

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
