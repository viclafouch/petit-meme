import { HTTP_STATUS } from '~/constants/http'
import type { serverEnv } from '~/env/server'
import { cronLogger } from '~/lib/logger'

type VerifyCronSecretParams = {
  request: Request
  secret: typeof serverEnv.CRON_SECRET
}

export const verifyCronSecret = ({
  request,
  secret
}: VerifyCronSecretParams): Response | null => {
  if (secret === undefined) {
    cronLogger.error('CRON_SECRET not set, refusing the cron request')

    return Response.json(
      { error: 'Unauthorized' },
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }

  const authorization = request.headers.get('authorization')

  if (authorization !== `Bearer ${secret}`) {
    cronLogger.warn('Unauthorized cron request')

    return Response.json(
      { error: 'Unauthorized' },
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }

  return null
}
