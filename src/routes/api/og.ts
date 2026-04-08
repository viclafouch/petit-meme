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

        const { fromJsx } = await import('@takumi-rs/helpers/jsx')
        const wasm = await import('@takumi-rs/wasm')

        const { node, stylesheets } = await fromJsx(
          OgTemplate({
            title: displayTitle,
            subtitle,
            hostname,
            logoUrl,
            heroImageUrl
          })
        )

        const renderer = new wasm.Renderer()

        await renderer.loadFonts([
          {
            name: 'Bricolage Grotesque',
            data: () => {
              return fetch(fontUrl).then((res) => {
                return res.arrayBuffer()
              })
            }
          }
        ])

        const imageBuffer = await renderer.render(node, {
          width: 1200,
          height: 630,
          format: 'png',
          stylesheets
        })

        renderer.free()

        return new Response(imageBuffer.buffer as ArrayBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`
          }
        })
      }
    }
  }
})
