import type { VariantProps } from 'class-variance-authority'
import { z } from 'zod'
import type { badgeVariants } from '~/components/ui/badge'
import { MEME_FILL_OMIT } from '~/constants/meme-fill'
import { BYTES_PER_KILOBYTE } from '~/constants/number'
import {
  SEARCH_PARAM_MAX_PAGE,
  SEARCH_QUERY_MAX_LENGTH
} from '~/constants/search-params'
import { DAY, DAYS_PER_WEEK } from '~/constants/time'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'

const MEME_VIDEO_SELECT = {
  id: true,
  bunnyId: true,
  duration: true,
  width: true,
  height: true,
  bunnyStatus: true
} as const satisfies Prisma.VideoSelect

export const MEME_VIDEO_INCLUDE = {
  video: { select: MEME_VIDEO_SELECT }
} as const satisfies Prisma.MemeInclude

export const MEME_FULL_INCLUDE = {
  ...MEME_VIDEO_INCLUDE,
  categories: { include: { category: { include: { translations: true } } } },
  translations: true,
  _count: { select: { bookmarkedBy: true } }
} as const satisfies Prisma.MemeInclude

export const MEME_ALGOLIA_INCLUDE = {
  ...MEME_VIDEO_INCLUDE,
  translations: true,
  categories: { include: { category: { include: { translations: true } } } }
} as const satisfies Prisma.MemeInclude

export const MEME_TRANSLATION_SELECT = {
  locale: true,
  title: true,
  description: true
} as const satisfies Prisma.MemeTranslationSelect

export const DEFAULT_MEME_TITLE = 'Sans titre'

export const ALL_CATEGORY_SLUG = 'all'

export const MEMES_SORTS = ['relevance', 'trending', 'new', 'popular'] as const

export type MemesSort = (typeof MEMES_SORTS)[number]

export const LEGACY_SORT_CATEGORY_SLUGS = {
  trending: 'trending',
  news: 'new',
  popular: 'popular'
} as const satisfies Record<string, MemesSort>

export const MEME_EXPORT_MODES = [
  'download',
  'share'
] as const satisfies readonly string[]

export type MemeExportMode = (typeof MEME_EXPORT_MODES)[number]

export const MEME_VIDEO_INTENTS = [
  ...MEME_EXPORT_MODES,
  'studio'
] as const satisfies readonly string[]

export type MemeVideoIntent = (typeof MEME_VIDEO_INTENTS)[number]

export const MEMES_PER_PAGE = 30

export const RELATED_MEMES_COUNT = 20

export const TRENDING_MEMES_COUNT = 12

export const RECOMMEND_TRENDING_CACHE_TTL = DAY
export const RECOMMEND_RELATED_CACHE_TTL = DAYS_PER_WEEK * DAY

export const TRENDING_CATEGORY_CACHE_TTL = DAY / 2
export const TRENDING_CATEGORY_LIMIT = 30
export const TRENDING_CATEGORY_DAYS = 7

export const TRENDING_WEIGHTS = {
  views: 1,
  bookmarks: 2,
  downloads: 3,
  generations: 4,
  shares: 5
} as const satisfies Record<string, number>

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
} as const satisfies Record<
  MemeStatus,
  {
    label: string
    className: string
    badgeVariant: VariantProps<typeof badgeVariants>['variant']
  }
>

export const CATEGORY_SLUG_REGEX = /^[\da-z-]{1,60}$/u

const SEARCH_QUERY_SCHEMA = z
  .string()
  .max(SEARCH_QUERY_MAX_LENGTH)
  .optional()
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  .catch(undefined)

const SEARCH_PAGE_SCHEMA = z.coerce
  .number()
  .int()
  .min(1)
  .max(SEARCH_PARAM_MAX_PAGE)
  .optional()
  // oxlint-disable-next-line promise/prefer-await-to-then -- Zod's catch() sets the parse fallback, it is no promise
  .catch(1)

export const MEMES_SEARCH_SCHEMA = z.object({
  query: SEARCH_QUERY_SCHEMA,
  page: SEARCH_PAGE_SCHEMA,
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  sort: z.enum(MEMES_SORTS).optional().catch(undefined)
})

export const MEMES_FILTERS_SCHEMA = z.object({
  ...MEMES_SEARCH_SCHEMA.shape,
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  category: z.string().regex(CATEGORY_SLUG_REGEX).optional().catch(undefined)
})

export type MemeFullData = Prisma.MemeGetPayload<{
  include: typeof MEME_FULL_INCLUDE
  omit: typeof MEME_FILL_OMIT
}>

export type MemeAlgoliaData = Prisma.MemeGetPayload<{
  include: typeof MEME_ALGOLIA_INCLUDE
  omit: typeof MEME_FILL_OMIT
}>

export type MemeWithVideo = Prisma.MemeGetPayload<{
  include: typeof MEME_VIDEO_INCLUDE
  omit: typeof MEME_FILL_OMIT
}>

export type MemeWithCategories = Prisma.MemeGetPayload<{
  include: { categories: { include: { category: true } } }
  omit: typeof MEME_FILL_OMIT
}>

const SIZE_IN_MB = 16
export const MAX_SIZE_MEME_IN_BYTES =
  SIZE_IN_MB * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE

const MEME_FILE_TO_SOURCE_SIZE_RATIO = 2

export const MAX_SIZE_MEME_FILE_IN_BYTES =
  MEME_FILE_TO_SOURCE_SIZE_RATIO * MAX_SIZE_MEME_IN_BYTES

export type MemesFilters = z.infer<typeof MEMES_FILTERS_SCHEMA>

export const ADMIN_MEMES_FILTERS_SCHEMA = z.object({
  query: SEARCH_QUERY_SCHEMA,
  page: SEARCH_PAGE_SCHEMA,
  status: z.enum(MemeStatus).optional(),
  contentLocale: z.enum(MemeContentLocale).optional(),
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  ready: z.boolean().optional().catch(undefined)
})

export type AdminMemesFilters = z.infer<typeof ADMIN_MEMES_FILTERS_SCHEMA>
