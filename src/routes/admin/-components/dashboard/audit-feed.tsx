import { getActionIcon } from '~/routes/admin/-helpers/action-icon'
import { formatAuditEntry } from '~/routes/admin/-helpers/audit'
import type { AuditLogEntry } from '~/routes/admin/-server/dashboard'
import { DashboardFeed, FeedActor } from './dashboard-feed'

type AuditFeedParams = {
  entries: AuditLogEntry[]
}

export const AuditFeed = ({ entries }: AuditFeedParams) => {
  return (
    <DashboardFeed
      emptyLabel="Aucune action récente"
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
