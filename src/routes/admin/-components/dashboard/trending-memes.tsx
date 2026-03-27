import {
  Bookmark,
  Download,
  Eye,
  Medal,
  Share2,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { buildVideoImageUrl } from '~/lib/bunny'
import { cn } from '~/lib/utils'
import { Link } from '@tanstack/react-router'
import type { IconConfig } from './types'

import type { TrendingMeme } from '~admin/-server/dashboard'

type SignalKey = keyof Omit<TrendingMeme, 'meme' | 'rank' | 'score'>

const SIGNAL_CONFIGS = [
  {
    key: 'views',
    icon: <Eye className="size-3" aria-hidden />,
    label: 'vues'
  },
  {
    key: 'bookmarks',
    icon: <Bookmark className="size-3" aria-hidden />,
    label: 'favoris'
  },
  {
    key: 'downloads',
    icon: <Download className="size-3" aria-hidden />,
    label: 'téléchargements'
  },
  {
    key: 'generations',
    icon: <Sparkles className="size-3" aria-hidden />,
    label: 'générations'
  },
  {
    key: 'shares',
    icon: <Share2 className="size-3" aria-hidden />,
    label: 'partages'
  }
] as const satisfies readonly IconConfig<SignalKey>[]

type PodiumConfig = {
  className: string
  label: string
}

const PODIUM_CONFIGS = {
  1: { className: 'text-amber-400', label: '1er' },
  2: { className: 'text-zinc-400', label: '2e' },
  3: { className: 'text-orange-500', label: '3e' }
} as const satisfies Record<number, PodiumConfig>

function matchIsPodiumRank(rank: number): rank is keyof typeof PODIUM_CONFIGS {
  return rank in PODIUM_CONFIGS
}

type TrendingMemesParams = {
  entries: TrendingMeme[]
}

export const TrendingMemes = ({ entries }: TrendingMemesParams) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <TrendingUp className="size-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucune tendance cette semaine
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        const podium = matchIsPodiumRank(entry.rank)
          ? PODIUM_CONFIGS[entry.rank]
          : null

        return (
          <Link
            key={entry.meme.id}
            to="/admin/library/$memeId"
            params={{ memeId: entry.meme.id }}
            className="flex items-center gap-3 py-3 hover:bg-accent/50 -mx-2 px-2 transition-colors"
          >
            <img
              src={buildVideoImageUrl(entry.meme.video.bunnyId)}
              alt={entry.meme.title}
              loading="lazy"
              decoding="async"
              className="size-10 shrink-0 rounded object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium">
                {entry.meme.title}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {SIGNAL_CONFIGS.map((signal) => {
                  const value = entry[signal.key]

                  return (
                    <span
                      key={signal.key}
                      className={cn(
                        'flex items-center gap-1 text-xs tabular-nums',
                        value > 0
                          ? 'text-foreground/70'
                          : 'text-muted-foreground'
                      )}
                      title={`${value} ${signal.label}`}
                    >
                      {signal.icon}
                      {value}
                    </span>
                  )
                })}
              </div>
            </div>
            {podium ? (
              <Medal
                className={cn('size-5 shrink-0', podium.className)}
                aria-label={podium.label}
              />
            ) : (
              <span className="flex size-5 shrink-0 items-center justify-center text-xs font-medium tabular-nums text-muted-foreground">
                {entry.rank}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
