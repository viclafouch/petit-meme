import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { OgHomeTemplate } from '~/components/og/og-home-template'
import { OgTemplate } from '~/components/og/og-template'
import { IMMUTABLE_CACHE_CONTROL } from '~/constants/http'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { clientEnv } from '~/env/client'
import { captureWithFeature } from '~/lib/sentry'
import type { OgDefaultedType } from '~/lib/seo'
import { OG_DEFAULTED_TYPE_VALUES, OG_TITLED_TYPE_VALUES } from '~/lib/seo'
import type { Locale } from '~/paraglide/runtime'
import { locales } from '~/paraglide/runtime'

const OG_SHARED_SHAPE = {
  subtitle: z.string().max(500).optional(),
  locale: z.enum(locales).default('fr')
}

const OG_TITLE = z.string().min(1).max(200)

const OG_QUERY_SCHEMA = z.discriminatedUnion('type', [
  z.object({ type: z.literal('home'), ...OG_SHARED_SHAPE }),
  z.object({
    type: z.enum(OG_DEFAULTED_TYPE_VALUES),
    title: OG_TITLE.optional(),
    ...OG_SHARED_SHAPE
  }),
  z.object({
    type: z.enum(OG_TITLED_TYPE_VALUES),
    title: OG_TITLE,
    ...OG_SHARED_SHAPE
  })
])

const OG_DEFAULT_TITLES = {
  fr: {
    'ai-search': 'Recherche IA',
    pricing: 'Tarifs',
    reels: 'Reels',
    submit: 'Soumettre un mème'
  },
  en: {
    'ai-search': 'AI Search',
    pricing: 'Pricing',
    reels: 'Reels',
    submit: 'Submit a meme'
  }
} as const satisfies Record<Locale, Record<OgDefaultedType, string>>

type OgPageQuery = Exclude<z.infer<typeof OG_QUERY_SCHEMA>, { type: 'home' }>

const resolvePageTitle = (query: OgPageQuery) => {
  if (query.type === 'category' || query.type === 'legal') {
    return query.title
  }

  return query.title ?? OG_DEFAULT_TITLES[query.locale][query.type]
}

/**
 * Every remote asset a template references is fetched over HTTP on each render.
 * Sharing one cache across renders drops the home template from 7 requests to 0
 * once warm, and coalesces concurrent requests for the same URL.
 */
const OG_IMAGE_FETCH_CACHE = new Map<string, Promise<ArrayBuffer>>()

export const Route = createFileRoute('/api/og')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const parsed = OG_QUERY_SCHEMA.safeParse(
          Object.fromEntries(url.searchParams)
        )

        if (!parsed.success) {
          return new Response('Invalid parameters', { status: 400 })
        }

        const query = parsed.data
        const siteUrl = clientEnv.VITE_SITE_URL
        const logoUrl = `${siteUrl}/images/og-logo.png`
        const fontUrl = `${siteUrl}/fonts/bricolage-grotesque-bold.ttf`
        const { hostname } = new URL(siteUrl)

        const { default: ImageResponse } = await import('takumi-js/response')

        const template =
          query.type === 'home'
            ? OgHomeTemplate({
                locale: query.locale,
                siteUrl,
                hostname,
                logoUrl
              })
            : OgTemplate({
                title: resolvePageTitle(query),
                subtitle: query.subtitle,
                hostname,
                logoUrl,
                heroImageUrl: `${siteUrl}/images/will-smith-flipped.png`
              })

        return new ImageResponse(template, {
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          images: { fetchCache: OG_IMAGE_FETCH_CACHE },
          // `fonts` is honoured at runtime but absent from takumi-js v2 public
          // types, so a typo here silently falls back to the embedded Geist
          // instead of failing the build.
          fonts: [
            {
              name: 'Bricolage Grotesque',
              data: () => {
                return fetch(fontUrl).then((res) => {
                  return res.arrayBuffer()
                })
              }
            }
          ],
          headers: { 'Cache-Control': IMMUTABLE_CACHE_CONTROL },
          onError: (error) => {
            captureWithFeature(error, 'og-image')
          }
        })
      }
    }
  }
})
