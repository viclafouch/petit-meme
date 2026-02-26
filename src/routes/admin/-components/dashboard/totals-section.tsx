import { Clock, Crown, FileVideo, Users } from 'lucide-react'
import type { DashboardTotals } from '@/server/admin/dashboard'

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
] as const satisfies readonly {
  key: keyof DashboardTotals
  label: string
  icon: React.ReactNode
}[]

type TotalsSectionParams = {
  totals: DashboardTotals
}

export const TotalsSection = ({ totals }: TotalsSectionParams) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TOTAL_CONFIGS.map((config) => {
        return (
          <div
            key={config.key}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              {config.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tabular-nums">
                {totals[config.key].toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-muted-foreground">
                {config.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
