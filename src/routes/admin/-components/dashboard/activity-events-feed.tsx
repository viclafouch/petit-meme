import { CountryFlag } from '~/components/country-flag'
import { ActivityTypeIcon } from '~/routes/admin/-components/activity-type-icon'
import {
  ACTIVITY_TYPE_DISPLAY,
  formatActivityEntry
} from '~/routes/admin/-helpers/activity'
import type { AdminActivityRow } from '~/routes/admin/-server/activity'
import { DashboardFeed, FeedActor } from './dashboard-feed'

type ActivityActorProps = {
  entry: AdminActivityRow
}

const ActivityActor = ({ entry }: ActivityActorProps) => {
  if (entry.user) {
    return <FeedActor name={entry.user.name} image={entry.user.image} />
  }

  if (!entry.ipAddress) {
    return <span className="truncate">Anonyme</span>
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {entry.country ? <CountryFlag countryCode={entry.country} /> : null}
      <span className="truncate font-mono">{entry.ipAddress}</span>
    </span>
  )
}

type ActivityEventsFeedProps = {
  entries: AdminActivityRow[]
  now: number
}

export const ActivityEventsFeed = ({
  entries,
  now
}: ActivityEventsFeedProps) => {
  return (
    <DashboardFeed
      emptyLabel="Aucun événement enregistré"
      now={now}
      entries={entries.map((entry) => {
        return {
          id: entry.id,
          icon: (
            <>
              <ActivityTypeIcon type={entry.type} className="size-4" />
              <span className="sr-only">
                {ACTIVITY_TYPE_DISPLAY[entry.type].label}
              </span>
            </>
          ),
          text: formatActivityEntry(entry),
          actor: <ActivityActor entry={entry} />,
          createdAt: new Date(entry.createdAt)
        }
      })}
    />
  )
}
