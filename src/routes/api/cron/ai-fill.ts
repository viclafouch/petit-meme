import { createFileRoute } from '@tanstack/react-router'
import { serverEnv } from '~/env/server.server'
import { cronLogger } from '~/lib/logger'
import { runMemeFillNight } from '~/server/admin/ai-assist/meme-fill-night.server'
import { verifyCronSecret } from '~/server/auth/cron-auth.server'

const log = cronLogger.child({ job: 'ai-fill' })

export const Route = createFileRoute('/api/cron/ai-fill')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret({
          request,
          secret: serverEnv.CRON_SECRET
        })

        if (authError) {
          return authError
        }

        try {
          const { isSent, digest } = await runMemeFillNight(new Date())
          const hasDigest =
            digest.readyDrafts.length > 0 || digest.failures.length > 0

          if (hasDigest && !isSent) {
            log.error('Failed to send the meme fill digest')
          }

          log.info(
            {
              isSent,
              readyDrafts: digest.readyDrafts.length,
              failures: digest.failures.length
            },
            'Meme fill night completed'
          )

          return Response.json({
            success: true,
            isSent,
            readyDrafts: digest.readyDrafts.length,
            failures: digest.failures.length
          })
        } catch (error) {
          log.error({ error }, 'Meme fill night cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
