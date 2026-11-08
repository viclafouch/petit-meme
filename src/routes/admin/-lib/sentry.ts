import { SENTRY_ORG } from '~/constants/sentry'

const SENTRY_ORG_URL = `https://${SENTRY_ORG}.sentry.io`

const SENTRY_USER_STATS_PERIOD = '30d'

const buildSentryUrl = (path: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams({
    ...params,
    statsPeriod: SENTRY_USER_STATS_PERIOD
  })

  return `${SENTRY_ORG_URL}${path}?${searchParams.toString()}`
}

export const buildSentryUserLinks = (userId: string) => {
  const userQuery = `user.id:${userId}`

  return [
    {
      label: 'Erreurs',
      href: buildSentryUrl('/issues/', { query: userQuery })
    },
    {
      label: 'Replays',
      href: buildSentryUrl('/explore/replays/', { query: userQuery })
    },
    {
      label: 'Logs',
      href: buildSentryUrl('/explore/logs/', { logsQuery: userQuery })
    }
  ] as const
}
