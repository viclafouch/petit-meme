import { ACTIVITY_IP_RETENTION_DAYS } from '~/constants/activity'
import { formatRelativeTime } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import { DetailList } from '~/routes/admin/-components/detail-list'
import { VisitorIpLink } from '~/routes/admin/-components/visitor-ip-link'
import { formatEventCount } from '~/routes/admin/-helpers/activity'
import type { AdminUserDetailPayload } from '~/routes/admin/-server/user-detail'

type UserIpListParams = {
  ipAddresses: AdminUserDetailPayload['ipAddresses']
}

export const UserIpList = ({ ipAddresses }: UserIpListParams) => {
  const locale = getLocale()

  return (
    <DetailList
      emptyLabel={`Aucune IP enregistrée sur les ${ACTIVITY_IP_RETENTION_DAYS} derniers jours`}
      rows={ipAddresses.map((entry) => {
        return {
          id: entry.ipAddress,
          content: (
            <VisitorIpLink
              ipAddress={entry.ipAddress}
              country={entry.country}
              className="text-sm"
            />
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
