import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { HTTP_STATUS, UNCACHED_CDN_HEADERS } from '~/constants/http'
import { THUMBNAIL_RATIOS } from '~/constants/og'
import {
  type OgDefaultedType,
  OG_DEFAULTED_TYPE_VALUES,
  OG_TITLED_TYPE_VALUES
} from '~/lib/seo/url'
import { type Locale, locales } from '~/paraglide/runtime'

const OG_SUBTITLE_MAX_LENGTH = 500
const OG_TITLE_MAX_LENGTH = 200

const OG_SHARED_SHAPE = {
  subtitle: z.string().max(OG_SUBTITLE_MAX_LENGTH).optional(),
  locale: z.enum(locales).default('fr')
}

const OG_TITLE = z.string().min(1).max(OG_TITLE_MAX_LENGTH)

const MEME_ID_MAX_LENGTH = 64

const MEME_ID = z.string().min(1).max(MEME_ID_MAX_LENGTH)

const OG_QUERY_SCHEMA = z.discriminatedUnion('type', [
  z.object({ type: z.literal('home'), ...OG_SHARED_SHAPE }),
  z.object({
    type: z.literal('meme'),
    id: MEME_ID
  }),
  z.object({
    type: z.literal('thumbnail'),
    id: MEME_ID,
    ratio: z.enum(THUMBNAIL_RATIOS)
  }),
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
    app: "L'application Petit Meme",
    pricing: 'Tarifs',
    reels: 'Reels',
    submit: 'Proposer un mème'
  },
  en: {
    'ai-search': 'AI Search',
    app: 'The Petit Meme application',
    pricing: 'Pricing',
    reels: 'Reels',
    submit: 'Suggest a meme'
  }
} as const satisfies Record<Locale, Record<OgDefaultedType, string>>

type OgPageQuery = Exclude<
  z.infer<typeof OG_QUERY_SCHEMA>,
  { type: 'home' } | { type: 'meme' } | { type: 'thumbnail' }
>

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
          return new Response('Invalid parameters', {
            status: HTTP_STATUS.BAD_REQUEST,
            headers: UNCACHED_CDN_HEADERS
          })
        }

        const query = parsed.data
        const {
          renderHomeOgImage,
          renderPageOgImage,
          renderPublishedMemeOgImage,
          renderPublishedThumbnail
        } = await import('~/server/seo/og-image.server')

        if (query.type === 'home') {
          return renderHomeOgImage(query.locale)
        }

        if (query.type === 'meme') {
          return renderPublishedMemeOgImage(query.id)
        }

        if (query.type === 'thumbnail') {
          return renderPublishedThumbnail(query.id, query.ratio)
        }

        return renderPageOgImage({
          title: resolvePageTitle(query),
          subtitle: query.subtitle
        })
      }
    }
  }
})
