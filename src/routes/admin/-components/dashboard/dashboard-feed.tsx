import { UserAvatar } from '~/components/user-avatar'
import { formatRelativeTime } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import { EmptyMessage } from '~/routes/admin/-components/empty-message'

type FeedActorParams = {
  name: string
  image: string | null
}

export const FeedActor = ({ name, image }: FeedActorParams) => {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <UserAvatar name={name} image={image} size="xs" />
      <span className="truncate">{name}</span>
    </span>
  )
}

type DashboardFeedEntry = {
  id: string
  icon: React.ReactNode
  text: string
  actor: React.ReactNode
  createdAt: Date
}

type DashboardFeedParams = {
  entries: DashboardFeedEntry[]
  emptyLabel: string
}

export const DashboardFeed = ({ entries, emptyLabel }: DashboardFeedParams) => {
  if (entries.length === 0) {
    return <EmptyMessage>{emptyLabel}</EmptyMessage>
  }

  const locale = getLocale()

  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {entry.icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm leading-snug truncate">{entry.text}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.actor}
                <span aria-hidden>·</span>
                <time
                  dateTime={entry.createdAt.toISOString()}
                  className="shrink-0"
                >
                  {formatRelativeTime(entry.createdAt, locale)}
                </time>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
