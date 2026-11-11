import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { OgHomeTemplate } from '~/components/og/og-home-template'
import { OgTemplate } from '~/components/og/og-template'
import { serverEnv } from '~/env/server.server'
import {
  type OgDefaultedType,
  OG_DEFAULTED_TYPE_VALUES,
  OG_TITLED_TYPE_VALUES
} from '~/lib/seo'
import { type Locale, locales } from '~/paraglide/runtime'
import { renderOgImage } from '~/server/seo/og-image.server'

const OG_SUBTITLE_MAX_LENGTH = 500
const OG_TITLE_MAX_LENGTH = 200

const OG_SHARED_SHAPE = {
  subtitle: z.string().max(OG_SUBTITLE_MAX_LENGTH).optional(),
  locale: z.enum(locales).default('fr')
}

const OG_TITLE = z.string().min(1).max(OG_TITLE_MAX_LENGTH)

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
    submit: 'Proposer un mème'
  },
  en: {
    'ai-search': 'AI Search',
    pricing: 'Pricing',
    reels: 'Reels',
    submit: 'Suggest a meme'
  }
} as const satisfies Record<Locale, Record<OgDefaultedType, string>>

type OgPageQuery = Exclude<z.infer<typeof OG_QUERY_SCHEMA>, { type: 'home' }>

const resolvePageTitle = (query: OgPageQuery) => {
  if (query.type === 'category' || query.type === 'legal') {
    return query.title
  }

  return query.title ?? OG_DEFAULT_TITLES[query.locale][query.type]
}

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
        const siteUrl = serverEnv.VITE_SITE_URL
        const logoUrl = `${siteUrl}/images/og-logo.png`
        const fontUrl = `${siteUrl}/fonts/bricolage-grotesque-bold.ttf`
        const { hostname } = new URL(siteUrl)

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

        return renderOgImage({ template, fontUrls: [fontUrl] })
      }
    }
  }
})
