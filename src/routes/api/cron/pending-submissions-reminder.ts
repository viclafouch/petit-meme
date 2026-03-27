import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import { MemeSubmissionStatus } from '~/db/generated/prisma/enums'
import { CONTACT_EMAIL } from '~/emails/constants'
import { PendingSubmissionsReminderEmail } from '~/emails/pending-submissions-reminder-email'
import { formatDate } from '~/helpers/date'
import { cronLogger } from '~/lib/logger'
import { EMAIL_FROM, getEmailRecipient, resend } from '~/lib/resend'
import { verifyCronSecret } from '~/utils/cron-auth'

const log = cronLogger.child({ job: 'pending-submissions-reminder' })

const SUBJECT = 'Petit Meme — Propositions en attente'

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}

const runPendingSubmissionsReminder = async () => {
  const submissions = await prismaClient.memeSubmission.findMany({
    where: { status: MemeSubmissionStatus.PENDING },
    select: {
      id: true,
      title: true,
      createdAt: true,
      user: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (submissions.length === 0) {
    log.info('No pending submissions')

    return { sent: false, count: 0 }
  }

  const emailSubmissions = submissions.map((submission) => {
    return {
      id: submission.id,
      title: submission.title,
      userName: submission.user.name ?? 'Anonyme',
      createdAt: formatDate(submission.createdAt, 'fr', LONG_DATE_OPTIONS)
    }
  })

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: getEmailRecipient(CONTACT_EMAIL),
    subject: SUBJECT,
    react: PendingSubmissionsReminderEmail({ submissions: emailSubmissions })
  })

  if (error) {
    log.error({ err: error }, 'Failed to send reminder email')

    return { sent: false, count: submissions.length }
  }

  log.info({ count: submissions.length }, 'Sent pending submissions reminder')

  return { sent: true, count: submissions.length }
}

export const Route = createFileRoute('/api/cron/pending-submissions-reminder')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret(request)

        if (authError) {
          return authError
        }

        try {
          const result = await runPendingSubmissionsReminder()

          return Response.json({ success: true, ...result })
        } catch (error) {
          log.error({ err: error }, 'Pending submissions reminder cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
