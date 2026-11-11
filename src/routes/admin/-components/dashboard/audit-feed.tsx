import { getActionIcon } from '~/routes/admin/-lib/action-icon'
import { formatAuditEntry } from '~/routes/admin/-lib/audit'
import type { AuditLogEntry } from '~/server/admin/dashboard/dashboard.functions'
import { DashboardFeed, FeedActor } from './dashboard-feed'

type AuditFeedProps = {
  entries: AuditLogEntry[]
  now: number
}

export const AuditFeed = ({ entries, now }: AuditFeedProps) => {
  return (
    <DashboardFeed
      emptyLabel="Aucune action récente"
      now={now}
      entries={entries.map((entry) => {
        return {
          id: entry.id,
          icon: getActionIcon(entry.action),
          text: formatAuditEntry(entry),
          actor: (
            <FeedActor
              name={entry.actingAdmin.name}
              image={entry.actingAdmin.image}
            />
          ),
          createdAt: new Date(entry.createdAt)
        }
      })}
    />
  )
}
