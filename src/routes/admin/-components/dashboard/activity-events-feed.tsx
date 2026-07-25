import {
  ActivityTypeIcon,
  formatActivityEntry
} from '~/routes/admin/-helpers/activity'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'
import { DashboardFeed, FeedActor } from './dashboard-feed'

type ActivityActorParams = {
  entry: AdminActivityRow
}

const ActivityActor = ({ entry }: ActivityActorParams) => {
  if (entry.user) {
    return <FeedActor name={entry.user.name} image={entry.user.image} />
  }

  return entry.ipAddress ? (
    <span className="truncate font-mono">{entry.ipAddress}</span>
  ) : (
    <span className="truncate">Anonyme</span>
  )
}

type ActivityEventsFeedParams = {
  entries: AdminActivityRow[]
}

export const ActivityEventsFeed = ({ entries }: ActivityEventsFeedParams) => {
  return (
    <DashboardFeed
      emptyLabel="Aucun événement enregistré"
      entries={entries.map((entry) => {
        return {
          id: entry.id,
          icon: <ActivityTypeIcon type={entry.type} className="size-4" />,
          text: formatActivityEntry(entry),
          actor: <ActivityActor entry={entry} />,
          createdAt: new Date(entry.createdAt)
        }
      })}
    />
  )
}
