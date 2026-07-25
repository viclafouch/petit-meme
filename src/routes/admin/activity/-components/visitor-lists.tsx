import { Link } from '@tanstack/react-router'
import { UserAvatar } from '~/components/user-avatar'
import { formatRelativeTime } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import { DetailList } from '~/routes/admin/-components/detail-list'
import { TruncatedText } from '~/routes/admin/-components/truncated-text'
import { formatEventCount } from '~/routes/admin/-helpers/activity'
import type { AdminVisitorDetailPayload } from '~/routes/admin/-server/visitor'

type VisitorMemeListParams = {
  memes: AdminVisitorDetailPayload['memes']
}

export const VisitorMemeList = ({ memes }: VisitorMemeListParams) => {
  return (
    <DetailList
      emptyLabel="Aucun meme touché"
      rows={memes.map((entry) => {
        return {
          id: entry.meme.id,
          content: (
            <Link
              to="/admin/library/$memeId"
              params={{ memeId: entry.meme.id }}
              className="truncate py-1 text-sm hover:text-primary transition-colors"
            >
              {entry.meme.title}
            </Link>
          ),
          trailing: formatEventCount(entry.eventCount)
        }
      })}
    />
  )
}

type VisitorUserAgentListParams = {
  userAgents: AdminVisitorDetailPayload['userAgents']
}

export const VisitorUserAgentList = ({
  userAgents
}: VisitorUserAgentListParams) => {
  return (
    <DetailList
      emptyLabel="Aucun user-agent observé"
      rows={userAgents.map((entry) => {
        return {
          id: entry.userAgent,
          content: (
            <TruncatedText
              text={entry.userAgent}
              className="text-muted-foreground"
            />
          ),
          trailing: formatEventCount(entry.eventCount)
        }
      })}
    />
  )
}

type VisitorAccountListParams = {
  users: AdminVisitorDetailPayload['users']
}

export const VisitorAccountList = ({ users }: VisitorAccountListParams) => {
  const locale = getLocale()

  return (
    <DetailList
      emptyLabel="Aucun compte associé"
      rows={users.map((entry) => {
        return {
          id: entry.user.id,
          content: (
            <Link
              to="/admin/users/$userId"
              params={{ userId: entry.user.id }}
              className="flex items-center gap-2 py-1 hover:text-primary transition-colors"
            >
              <UserAvatar
                name={entry.user.name}
                image={entry.user.image}
                size="sm"
              />
              <span className="truncate text-sm font-medium">
                {entry.user.name}
              </span>
            </Link>
          ),
          subtitle: entry.lastSeenAt
            ? formatRelativeTime(new Date(entry.lastSeenAt), locale)
            : null,
          trailing: formatEventCount(entry.eventCount)
        }
      })}
    />
  )
}
