import { Clock, Crown, FileVideo, Users } from 'lucide-react'
import { StatTiles } from '~/routes/admin/-components/stat-tiles'
import type { DashboardTotals } from '~/routes/admin/-server/dashboard'
import type { IconConfig } from './types'

const TOTAL_CONFIGS = [
  {
    key: 'publishedMemes',
    label: 'Memes publiés',
    icon: <FileVideo className="size-4" aria-hidden />
  },
  {
    key: 'pendingMemes',
    label: 'En attente',
    icon: <Clock className="size-4" aria-hidden />
  },
  {
    key: 'totalUsers',
    label: 'Utilisateurs',
    icon: <Users className="size-4" aria-hidden />
  },
  {
    key: 'activePremium',
    label: 'Premium actifs',
    icon: <Crown className="size-4" aria-hidden />
  }
] as const satisfies readonly IconConfig<keyof DashboardTotals>[]

type TotalsSectionParams = {
  totals: DashboardTotals
}

export const TotalsSection = ({ totals }: TotalsSectionParams) => {
  return (
    <StatTiles
      tiles={TOTAL_CONFIGS.map((config) => {
        return {
          key: config.key,
          label: config.label,
          value: totals[config.key],
          icon: config.icon
        }
      })}
    />
  )
}
