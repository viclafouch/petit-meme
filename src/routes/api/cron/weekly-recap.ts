import { createFileRoute } from '@tanstack/react-router'
import { CONTACT_EMAIL } from '~/emails/constants'
import { WeeklyRecapEmail } from '~/emails/weekly-recap-email'
import { serverEnv } from '~/env/server.server'
import { getWeeklyRecapPeriodLabel } from '~/helpers/weekly-recap'
import { cronLogger } from '~/lib/logger'
import { buildWeeklyRecap } from '~/server/admin/weekly-recap/weekly-recap.server'
import { verifyCronSecret } from '~/server/auth/cron-auth.server'
import { sendEmail } from '~/server/platforms/resend.server'

const log = cronLogger.child({ job: 'weekly-recap' })

const runWeeklyRecap = async () => {
  const recap = await buildWeeklyRecap(new Date())

  const isSent = await sendEmail({
    to: CONTACT_EMAIL,
    subject: `Petit Meme : récap ${getWeeklyRecapPeriodLabel(recap.window)}`,
    react: WeeklyRecapEmail({ recap }),
    idempotencyKey: `weekly-recap/${recap.window.start.toISOString()}`
  })

  if (!isSent) {
    log.error('Failed to send weekly recap email')

    return { sent: false }
  }

  log.info({ week: recap.week }, 'Sent weekly recap')

  return { sent: true }
}

export const Route = createFileRoute('/api/cron/weekly-recap')({
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
          const result = await runWeeklyRecap()

          return Response.json({ success: true, ...result })
        } catch (error) {
          log.error({ error }, 'Weekly recap cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
