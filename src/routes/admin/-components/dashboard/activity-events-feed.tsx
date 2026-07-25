import { CountryFlag } from '~/components/country-flag'
import {
  ACTIVITY_TYPE_DISPLAY,
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
