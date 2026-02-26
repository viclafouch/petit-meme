import {
  Bookmark,
  Download,
  Eye,
  Share2,
  Sparkles,
  UserPlus,
  Video
} from 'lucide-react'
import type { DashboardStats } from '@/server/admin/dashboard'
import { KpiCard } from './kpi-card'

const KPI_CONFIGS = [
  { key: 'views', label: 'Vues', icon: <Eye className="size-4" aria-hidden /> },
  {
    key: 'newUsers',
    label: 'Nouveaux utilisateurs',
    icon: <UserPlus className="size-4" aria-hidden />
  },
  {
    key: 'newMemes',
    label: 'Nouveaux memes',
    icon: <Video className="size-4" aria-hidden />
  },
  {
    key: 'studioGenerations',
    label: 'Générations Studio',
    icon: <Sparkles className="size-4" aria-hidden />
  },
  {
    key: 'bookmarks',
    label: 'Bookmarks',
    icon: <Bookmark className="size-4" aria-hidden />
  },
  {
    key: 'shares',
    label: 'Partages',
    icon: <Share2 className="size-4" aria-hidden />
  },
  {
    key: 'downloads',
    label: 'Téléchargements',
    icon: <Download className="size-4" aria-hidden />
  }
] as const satisfies readonly {
  key: keyof DashboardStats['kpis']
  label: string
  icon: React.ReactNode
}[]

type KpiGridParams = {
  kpis: DashboardStats['kpis']
}

export const KpiGrid = ({ kpis }: KpiGridParams) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_CONFIGS.map((config) => {
        return (
          <KpiCard
            key={config.key}
            data={kpis[config.key]}
            label={config.label}
            icon={config.icon}
          />
        )
      })}
    </div>
  )
}
