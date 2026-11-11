import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db/client.server'
import { MemeProposalStatus } from '~/db/generated/prisma/enums'
import { CONTACT_EMAIL } from '~/emails/constants'
import { PendingProposalsReminderEmail } from '~/emails/pending-proposals-reminder-email'
import { serverEnv } from '~/env/server.server'
import { formatDate, truncateToUtcDay } from '~/helpers/date'
import { cronLogger } from '~/lib/logger'
import { verifyCronSecret } from '~/server/auth/cron-auth.server'
import { sendEmail } from '~/server/platforms/resend.server'

const log = cronLogger.child({ job: 'pending-proposals-reminder' })

const SUBJECT = 'Petit Meme — Propositions en attente'

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}

const runPendingProposalsReminder = async () => {
  const proposals = await prismaClient.memeProposal.findMany({
    where: { status: MemeProposalStatus.PENDING },
    select: {
      id: true,
      title: true,
      createdAt: true,
      user: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (proposals.length === 0) {
    log.info('No pending proposals')

    return { sent: false, count: 0 }
  }

  const emailProposals = proposals.map((proposal) => {
    return {
      id: proposal.id,
      title: proposal.title,
      userName: proposal.user.name,
      createdAt: formatDate(proposal.createdAt, 'fr', LONG_DATE_OPTIONS)
    }
  })

  const isSent = await sendEmail({
    to: CONTACT_EMAIL,
    subject: SUBJECT,
    react: PendingProposalsReminderEmail({ proposals: emailProposals }),
    idempotencyKey: `pending-proposals-reminder/${truncateToUtcDay(new Date()).toISOString()}`
  })

  if (!isSent) {
    log.error('Failed to send reminder email')

    return { sent: false, count: proposals.length }
  }

  log.info({ count: proposals.length }, 'Sent pending proposals reminder')

  return { sent: true, count: proposals.length }
}

export const Route = createFileRoute('/api/cron/pending-proposals-reminder')({
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
          const result = await runPendingProposalsReminder()

          return Response.json({ success: true, ...result })
        } catch (error) {
          log.error({ error }, 'Pending proposals reminder cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
