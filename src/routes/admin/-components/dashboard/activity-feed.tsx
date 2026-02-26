import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getActionIcon } from '@/helpers/action-icon'
import { formatAuditEntry } from '@/helpers/audit'
import { getUserInitials } from '@/helpers/format'
import type { AuditLogEntry } from '@/server/admin/dashboard'

type ActivityFeedParams = {
  entries: AuditLogEntry[]
}

export const ActivityFeed = ({ entries }: ActivityFeedParams) => {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Aucune activité récente
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        const createdAtDate = new Date(entry.createdAt)

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {getActionIcon(entry.action)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm leading-snug truncate">
                {formatAuditEntry(entry)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="size-4">
                  <AvatarImage src={entry.actingAdmin.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getUserInitials(entry.actingAdmin.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{entry.actingAdmin.name}</span>
                <span aria-hidden>·</span>
                <time dateTime={createdAtDate.toISOString()}>
                  {formatDistanceToNow(createdAtDate, {
                    addSuffix: true,
                    locale: fr
                  })}
                </time>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
