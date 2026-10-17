import type * as Sentry from '@sentry/tanstackstart-react'

type SentryDataCollection = NonNullable<
  Parameters<typeof Sentry.init>[0]['dataCollection']
>

const PII_KEY_DENYLIST = ['forwarded', '-ip', 'remote-', 'via', '-user']

export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: PII_KEY_DENYLIST },
    response: { deny: PII_KEY_DENYLIST }
  },
  httpBodies: [],
  urlQueryParams: { deny: PII_KEY_DENYLIST },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  graphQL: { document: false, variables: false }
} satisfies SentryDataCollection

export const SENTRY_APPLICATION_KEY = 'petit-meme'

export const SENTRY_TRACES_SAMPLE_RATE = 0.2

export const SENTRY_IGNORE_ERRORS = [/Unreachable hosts/u]

export const BROWSER_NETWORK_ERRORS = [
  /^Failed to fetch$/u,
  /^Load failed$/u,
  /^NetworkError when attempting to fetch resource\.$/u
]
