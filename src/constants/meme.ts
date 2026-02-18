import type { VariantProps } from 'class-variance-authority'
import { z } from 'zod'
import type { badgeVariants } from '@/components/ui/badge'
import { type Prisma } from '@/db/generated/prisma/client'
import { MemeStatus } from '@/db/generated/prisma/enums'

export const MEME_FULL_INCLUDE = {
  video: true,
  categories: { include: { category: true } }
} as const satisfies Prisma.MemeInclude

export const DEFAULT_MEME_TITLE = 'Sans titre'
export const LEGACY_MEME_TITLE = 'Titre inconnu'

export const NEWS_CATEGORY_SLUG = 'news'

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

export const MEMES_SEARCH_SCHEMA = z.object({
  // eslint-disable-next-line unicorn/no-useless-undefined
  query: z.string().optional().catch(undefined),
  page: z.coerce.number().optional().catch(1),
  status: z.enum(MemeStatus).optional()
})

export const MEMES_FILTERS_SCHEMA = z.object({
  ...MEMES_SEARCH_SCHEMA.shape,
  category: z.string().optional()
})

export type MemeWithVideo = Prisma.MemeGetPayload<{
  include: { video: true }
}>

export type MemeWithCategories = Prisma.MemeGetPayload<{
  include: { categories: { include: { category: true } } }
}>

const TWITTER_REGEX_THAT_INCLUDES_ID =
  /^https?:\/\/(?:twitter\.com|x\.com)\/(?:[A-Za-z0-9_]+\/status\/\d+|i\/bookmarks\?post_id=\d+)/

export const TWEET_LINK_SCHEMA = z
  .url({ protocol: /^https$/, hostname: /^(twitter|x)\.com$/ })
  .regex(TWITTER_REGEX_THAT_INCLUDES_ID, 'Invalid tweet URL')

const SIZE_IN_MB = 16
export const MAX_SIZE_MEME_IN_BYTES = SIZE_IN_MB * 1024 * 1024

export type MemesFilters = z.infer<typeof MEMES_FILTERS_SCHEMA>
