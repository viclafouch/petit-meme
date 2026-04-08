import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { OgTemplate } from '~/components/og/og-template'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { clientEnv } from '~/env/client'
import type { OgImageType } from '~/lib/seo'
import { OG_TYPE_VALUES } from '~/lib/seo'
import type { Locale } from '~/paraglide/runtime'
import { locales } from '~/paraglide/runtime'

const OG_QUERY_SCHEMA = z.object({
  type: z.enum(OG_TYPE_VALUES),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  locale: z.enum(locales).default('fr')
})

const OG_DEFAULT_TITLES = {
  fr: {
    category: undefined,
    'ai-search': 'Recherche IA',
    pricing: 'Tarifs',
    reels: 'Reels',
    submit: 'Soumettre un mème',
    legal: undefined
  },
  en: {
    category: undefined,
    'ai-search': 'AI Search',
    pricing: 'Pricing',
    reels: 'Reels',
    submit: 'Submit a meme',
    legal: undefined
  }
} as const satisfies Record<Locale, Record<OgImageType, string | undefined>>

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

        const { type, title, subtitle, locale } = parsed.data
        const siteUrl = clientEnv.VITE_SITE_URL
        const logoUrl = `${siteUrl}/images/og-logo.png`
        const heroImageUrl = `${siteUrl}/images/will-smith-flipped.png`
        const fontUrl = `${siteUrl}/fonts/bricolage-grotesque-bold.ttf`
        const { hostname } = new URL(siteUrl)

        const displayTitle = title ?? OG_DEFAULT_TITLES[locale][type] ?? type

        const { ImageResponse } = await import('takumi-js/response')

        const response = new ImageResponse(
          OgTemplate({
            title: displayTitle,
            subtitle,
            hostname,
            logoUrl,
            heroImageUrl
          }),
          {
            width: 1200,
            height: 630,
            fonts: [
              {
                name: 'Bricolage Grotesque',
                data: () => {
                  return fetch(fontUrl).then((res) => {
                    return res.arrayBuffer()
                  })
                }
              }
            ]
          }
        )

        response.headers.set(
          'Cache-Control',
          `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`
        )

        return response
      }
    }
  }
})
