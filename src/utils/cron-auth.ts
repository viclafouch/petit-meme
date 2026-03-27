import { serverEnv } from '~/env/server'
import { cronLogger } from '~/lib/logger'

export const verifyCronSecret = (request: Request): Response | null => {
  const secret = serverEnv.CRON_SECRET

  if (!secret) {
    cronLogger.warn('CRON_SECRET not set — skipping auth check')

    return null
  }

  const authorization = request.headers.get('authorization')

  if (authorization !== `Bearer ${secret}`) {
    cronLogger.warn('Unauthorized cron request')

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
