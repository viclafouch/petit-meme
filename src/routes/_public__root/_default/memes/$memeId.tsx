import { createFileRoute } from '@tanstack/react-router'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { getCrawlerStreamUrl } from '~/lib/crawler-video'
import { buildBreadcrumbJsonLd, buildMemeJsonLd } from '~/lib/seo/json-ld'
import { buildMemeSeo } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import { getMemeQueryOpts, getMemePlaybackUrlQueryOpts } from '~/queries/meme'
import { MemePage } from './-components/meme-page'

export const Route = createFileRoute('/_public__root/_default/memes/$memeId')({
  component: MemePage,
  pendingMs: 1000,
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.query({
      ...getMemeQueryOpts(params.memeId),
      staleTime: 'static'
    })

    void Promise.allSettled([
      context.queryClient.query(getMemePlaybackUrlQueryOpts(meme.id))
    ])

    const crawlerStreamUrl =
      meme.status === MemeStatus.PUBLISHED
        ? await getCrawlerStreamUrl(meme.video.bunnyId)
        : null

    return {
      meme,
      crawlerStreamUrl
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
          children: JSON.stringify(
            buildMemeJsonLd(meme, loaderData.crawlerStreamUrl)
          )
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(
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
        links: [
          ...seo.links,
          {
            rel: 'preload',
            as: 'image',
            href: buildVideoImageUrl(loaderData.meme.video.bunnyId)
          }
        ]
      }
    }

    return {}
  }
})
