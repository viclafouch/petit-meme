import { ArrowRight, Clock, SquareLibrary, Users, Video } from 'lucide-react'
import type { DashboardStats } from '@/server/admin/dashboard'
import { Link, linkOptions } from '@tanstack/react-router'

function buildQuickLinks(totals: DashboardStats['totals']) {
  return linkOptions([
    {
      to: '/admin/library',
      search: { status: 'PENDING' },
      label: `${totals.pendingMemes} memes en attente`,
      icon: <Clock className="size-4" aria-hidden />
    },
    {
      to: '/admin/users',
      label: `${totals.totalUsers} utilisateurs`,
      icon: <Users className="size-4" aria-hidden />
    },
    {
      to: '/admin/library',
      label: 'Librairie',
      icon: <Video className="size-4" aria-hidden />
    },
    {
      to: '/admin/categories',
      label: 'Catégories',
      icon: <SquareLibrary className="size-4" aria-hidden />
    }
  ])
}

type QuickLinksParams = {
  totals: DashboardStats['totals']
}

export const QuickLinks = ({ totals }: QuickLinksParams) => {
  const links = buildQuickLinks(totals)

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {links.map((link) => {
        return (
          <Link
            {...link}
            key={link.label}
            className="group flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{link.icon}</span>
              <span className="text-sm font-medium">{link.label}</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}
