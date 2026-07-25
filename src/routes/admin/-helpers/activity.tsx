import {
  Bookmark,
  Crown,
  Download,
  Eye,
  Share2,
  Sparkles,
  UserPlus,
  Wand2
} from 'lucide-react'
import { z } from 'zod'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { getLocale } from '~/paraglide/runtime'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'

type ActivityTypeDisplay = {
  label: string
  pluralLabel: string
  icon: React.ComponentType<React.ComponentProps<'svg'>>
}

export const ACTIVITY_TYPE_DISPLAY = {
  [ActivityEventType.VIEW]: {
    label: 'Vue',
    pluralLabel: 'Vues',
    icon: Eye
  },
  [ActivityEventType.DOWNLOAD]: {
    label: 'Téléchargement',
    pluralLabel: 'Téléchargements',
    icon: Download
  },
  [ActivityEventType.SHARE]: {
    label: 'Partage',
    pluralLabel: 'Partages',
    icon: Share2
  },
  [ActivityEventType.GENERATION]: {
    label: 'Génération',
    pluralLabel: 'Générations',
    icon: Wand2
  },
  [ActivityEventType.AI_SEARCH]: {
    label: 'Recherche IA',
    pluralLabel: 'Recherches IA',
    icon: Sparkles
  },
  [ActivityEventType.BOOKMARK_ADDED]: {
    label: 'Favori',
    pluralLabel: 'Favoris',
    icon: Bookmark
  },
  [ActivityEventType.SIGNUP]: {
    label: 'Inscription',
    pluralLabel: 'Inscriptions',
    icon: UserPlus
  },
  [ActivityEventType.SUBSCRIPTION]: {
    label: 'Abonnement',
    pluralLabel: 'Abonnements',
    icon: Crown
  }
} as const satisfies Record<ActivityEventType, ActivityTypeDisplay>

export const ACTIVITY_TYPE_OPTIONS = Object.values(ActivityEventType)

export function formatEventCount(total: number) {
  const formattedTotal = new Intl.NumberFormat(getLocale()).format(total)

  return total > 1
    ? `${formattedTotal} événements`
    : `${formattedTotal} événement`
}

const ACTIVITY_METADATA_SCHEMA = z
  .object({ prompt: z.string(), plan: z.string() })
  .partial()
  .catch({})

export function getActivityMetadataText(
  metadata: AdminActivityRow['metadata']
) {
  const { prompt, plan } = ACTIVITY_METADATA_SCHEMA.parse(metadata)

  return prompt ?? plan ?? null
}

type ActivityEntryParams = Pick<AdminActivityRow, 'type' | 'meme' | 'metadata'>

export function formatActivityEntry({
  type,
  meme,
  metadata
}: ActivityEntryParams) {
  const { label } = ACTIVITY_TYPE_DISPLAY[type]
  const detail = meme?.title ?? getActivityMetadataText(metadata)

  return detail ? `${label} : ${detail}` : label
}

type ActivityTypeIconParams = {
  type: ActivityEventType
  className?: string
}

export const ActivityTypeIcon = ({
  type,
  className
}: ActivityTypeIconParams) => {
  const Icon = ACTIVITY_TYPE_DISPLAY[type].icon

  return <Icon className={className} aria-hidden />
}
