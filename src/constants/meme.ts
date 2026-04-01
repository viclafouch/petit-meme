import type { VariantProps } from 'class-variance-authority'
import { z } from 'zod'
import type { badgeVariants } from '~/components/ui/badge'
import { DAY } from '~/constants/time'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import { FILTERABLE_CONTENT_LOCALES } from '~/helpers/i18n-content'
import { m } from '~/paraglide/messages.js'

export const MEME_FULL_INCLUDE = {
  video: true,
  categories: { include: { category: { include: { translations: true } } } },
  translations: true,
  _count: { select: { bookmarkedBy: true } }
} as const satisfies Prisma.MemeInclude

export const MEME_ALGOLIA_INCLUDE = {
  video: true,
  translations: true,
  categories: { include: { category: { include: { translations: true } } } }
} as const satisfies Prisma.MemeInclude

export const MEME_TRANSLATION_SELECT = {
  locale: true,
  title: true,
  description: true
} as const satisfies Prisma.MemeTranslationSelect

export const DEFAULT_MEME_TITLE = 'Sans titre'
export const LEGACY_MEME_TITLE = 'Titre inconnu'

export const NEWS_CATEGORY_SLUG = 'news'
export const POPULAR_CATEGORY_SLUG = 'popular'

export const VIRTUAL_CATEGORY_SLUGS = new Set([
  NEWS_CATEGORY_SLUG,
  POPULAR_CATEGORY_SLUG
])

type VirtualCategory = {
  id: string
  title: string
  slug: string
  keywords: string[]
}

export const getVirtualCategories = (): VirtualCategory[] => {
  return [
    {
      id: 'virtual-news',
      title: m.meme_category_news(),
      slug: NEWS_CATEGORY_SLUG,
      keywords: []
    },
    {
      id: 'virtual-popular',
      title: m.meme_category_popular(),
      slug: POPULAR_CATEGORY_SLUG,
      keywords: []
    }
  ]
}

export const MEMES_PER_PAGE = 30
export const RELATED_MEMES_COUNT = 4
export const TRENDING_MEMES_COUNT = 12

export const RECOMMEND_TRENDING_CACHE_TTL = DAY
export const RECOMMEND_RELATED_CACHE_TTL = 7 * DAY

export const MemeStatusMeta = {
  PENDING: {
    label: 'En attente',
    className: 'text-destructive',
    badgeVariant: 'info'
  },
  PUBLISHED: {
    label: 'Publié',
    className: 'text-primary',
    badgeVariant: 'success'
  },
  REJECTED: {
    label: 'Rejeté',
    className: 'text-destructive',
    badgeVariant: 'warning'
  },
  ARCHIVED: {
    label: 'Archivé',
    className: 'text-muted-foreground',
    badgeVariant: 'destructive'
  }
} as const satisfies {
  [key in MemeStatus]: {
    label: string
    className: string
    badgeVariant: VariantProps<typeof badgeVariants>['variant']
  }
}

export const CATEGORY_SLUG_REGEX = /^[\da-z-]{1,60}$/

export const MEMES_SEARCH_SCHEMA = z.object({
  // oxlint-disable-next-line unicorn/no-useless-undefined
  query: z.string().max(200).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(1),
  status: z.enum(MemeStatus).optional(),
  contentLocale: z.enum(MemeContentLocale).optional(),
  contentLocales: z
    .string()
    .refine((value) => {
      return value.split(',').every((part) => {
        return (FILTERABLE_CONTENT_LOCALES as readonly string[]).includes(part)
      })
    })
    .optional()
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Zod .catch() requires an argument
    .catch(undefined)
})

export const MEMES_FILTERS_SCHEMA = z.object({
  ...MEMES_SEARCH_SCHEMA.shape,
  // oxlint-disable-next-line unicorn/no-useless-undefined
  category: z.string().regex(CATEGORY_SLUG_REGEX).optional().catch(undefined)
})

export type MemeFullData = Prisma.MemeGetPayload<{
  include: typeof MEME_FULL_INCLUDE
}>

export type MemeAlgoliaData = Prisma.MemeGetPayload<{
  include: typeof MEME_ALGOLIA_INCLUDE
}>

export type MemeWithVideo = Prisma.MemeGetPayload<{
  include: { video: true }
}>

export type MemeWithCategories = Prisma.MemeGetPayload<{
  include: { categories: { include: { category: true } } }
}>

const SIZE_IN_MB = 16
export const MAX_SIZE_MEME_IN_BYTES = SIZE_IN_MB * 1024 * 1024

export type MemesFilters = z.infer<typeof MEMES_FILTERS_SCHEMA>
