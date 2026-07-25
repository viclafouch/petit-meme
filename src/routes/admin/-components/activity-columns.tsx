import { Link } from '@tanstack/react-router'
import type { VisibilityState } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'
import { Badge } from '~/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import { UserAvatar } from '~/components/user-avatar'
import { ACTIVITY_IP_RETENTION_DAYS } from '~/constants/activity'
import { DAY } from '~/constants/time'
import { EmptyCell } from '~/routes/admin/-components/empty-cell'
import { RelativeDateTooltip } from '~/routes/admin/-components/relative-date-tooltip'
import { VisitorIpLink } from '~/routes/admin/-components/visitor-ip-link'
import {
  ACTIVITY_TYPE_DISPLAY,
  ActivityTypeIcon
} from '~/routes/admin/-helpers/activity'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'

function getMissingIpReason(createdAt: AdminActivityRow['createdAt']) {
  const purgeThreshold = Date.now() - ACTIVITY_IP_RETENTION_DAYS * DAY

  if (new Date(createdAt).getTime() < purgeThreshold) {
    return `IP purgée automatiquement après ${ACTIVITY_IP_RETENTION_DAYS} jours`
  }

  return 'Aucune IP collectée pour cet événement'
}

const columnHelper = createColumnHelper<AdminActivityRow>()

export const ACTIVITY_COLUMNS = [
  columnHelper.accessor('type', {
    header: 'Type',
    enableSorting: false,
    cell: (info) => {
      const type = info.getValue()

      return (
        <div className="flex items-center gap-2 text-sm">
          <ActivityTypeIcon
            type={type}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="whitespace-nowrap">
            {ACTIVITY_TYPE_DISPLAY[type].label}
          </span>
        </div>
      )
    }
  }),
  columnHelper.display({
    id: 'visitor',
    header: 'Visiteur',
    cell: (info) => {
      const { user } = info.row.original

      if (!user) {
        return (
          <Badge variant="outline" size="sm">
            Anonyme
          </Badge>
        )
      }

      return (
        <Link
          to="/admin/users/$userId"
          params={{ userId: user.id }}
          className="flex items-center gap-2 py-1 hover:text-primary transition-colors"
        >
          <UserAvatar name={user.name} image={user.image} />
          <div className="flex min-w-0 flex-col">
            <span className="max-w-32 truncate font-medium">{user.name}</span>
            <span className="max-w-32 truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </Link>
      )
    }
  }),
  columnHelper.display({
    id: 'meme',
    header: 'Meme',
    cell: (info) => {
      const { meme } = info.row.original

      if (!meme) {
        return <EmptyCell />
      }

      return (
        <Link
          to="/admin/library/$memeId"
          params={{ memeId: meme.id }}
          className="block max-w-40 truncate py-1 text-sm hover:text-primary transition-colors"
        >
          {meme.title}
        </Link>
      )
    }
  }),
  columnHelper.accessor('ipAddress', {
    header: 'IP',
    enableSorting: false,
    cell: (info) => {
      const ipAddress = info.getValue()
      const { country } = info.row.original

      if (ipAddress) {
        return (
          <VisitorIpLink
            ipAddress={ipAddress}
            country={country}
            className="text-xs"
          />
        )
      }

      return (
        <Tooltip>
          <TooltipTrigger className="cursor-default rounded-sm">
            <EmptyCell />
          </TooltipTrigger>
          <TooltipContent>
            {getMissingIpReason(info.row.original.createdAt)}
          </TooltipContent>
        </Tooltip>
      )
    }
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    enableSorting: false,
    cell: (info) => {
      return <RelativeDateTooltip date={new Date(info.getValue())} />
    }
  })
]

export const ACTIVITY_TIMELINE_SCOPES = {
  global: {},
  user: { visitor: false },
  visitor: { ipAddress: false }
} as const satisfies Record<string, VisibilityState>

export type ActivityTimelineScope = keyof typeof ACTIVITY_TIMELINE_SCOPES
