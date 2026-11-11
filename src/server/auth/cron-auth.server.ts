import { HTTP_STATUS } from '~/constants/http'
import type { serverEnv } from '~/env/server.server'
import { cronLogger } from '~/lib/logger'

type VerifyCronSecretParams = {
  request: Request
  secret: typeof serverEnv.CRON_SECRET
}

const buildUnauthorizedResponse = () => {
  return Response.json(
    { error: 'Unauthorized' },
    { status: HTTP_STATUS.UNAUTHORIZED }
  )
}

export const verifyCronSecret = ({
  request,
  secret
}: VerifyCronSecretParams): Response | null => {
  if (secret === undefined) {
    cronLogger.error('CRON_SECRET not set, refusing the cron request')

    return buildUnauthorizedResponse()
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    cronLogger.warn('Unauthorized cron request')

    return buildUnauthorizedResponse()
  }

  return null
}
