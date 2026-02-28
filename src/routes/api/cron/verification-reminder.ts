/* eslint-disable no-await-in-loop */
import { randomBytes, randomUUID } from 'node:crypto'
import { DAY, HOUR } from '@/constants/time'
import { prismaClient } from '@/db'
import { VerificationReminderEmail } from '@/emails/verification-reminder-email'
import { clientEnv } from '@/env/client'
import { cronLogger } from '@/lib/logger'
import { EMAIL_FROM, getEmailRecipient, resend } from '@/lib/resend'
import { verifyCronSecret } from '@/utils/cron-auth'
import { createFileRoute } from '@tanstack/react-router'

const log = cronLogger.child({ job: 'verification-reminder' })

const REMINDER_AFTER_HOURS = 42
const REMINDER_BEFORE_HOURS = 54
const TOKEN_EXPIRY_MS = DAY

const sendReminderToUser = async (
  user: { id: string; email: string; name: string | null },
  now: Date
) => {
  const token = randomBytes(32).toString('hex')

  await prismaClient.verification.create({
    data: {
      id: randomUUID(),
      identifier: user.email,
      value: token,
      expiresAt: new Date(now.getTime() + TOKEN_EXPIRY_MS),
      createdAt: now,
      updatedAt: now
    }
  })

  const verificationUrl = `${clientEnv.VITE_SITE_URL}/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/')}`

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: getEmailRecipient(user.email),
    subject: 'Rappel : confirme ton email Petit Mème',
    react: VerificationReminderEmail({
      username: user.name ?? 'there',
      verificationUrl
    })
  })

  if (error) {
    log.error({ err: error, email: user.email }, 'Failed to send reminder')

    return false
  }

  await prismaClient.user.update({
    where: { id: user.id },
    data: { verificationReminderSent: true }
  })

  log.info({ email: user.email }, 'Sent reminder')

  return true
}

const runVerificationReminders = async () => {
  const now = new Date()
  const oldestCreatedAt = new Date(now.getTime() - REMINDER_BEFORE_HOURS * HOUR)
  const newestCreatedAt = new Date(now.getTime() - REMINDER_AFTER_HOURS * HOUR)

  const users = await prismaClient.user.findMany({
    where: {
      emailVerified: false,
      verificationReminderSent: false,
      createdAt: {
        gte: oldestCreatedAt,
        lte: newestCreatedAt
      }
    },
    select: { id: true, email: true, name: true }
  })

  if (users.length === 0) {
    log.info('No users to remind')

    return { sentCount: 0, errorCount: 0 }
  }

  let sentCount = 0
  let errorCount = 0

  for (const user of users) {
    try {
      const isSent = await sendReminderToUser(user, now)

      if (isSent) {
        sentCount += 1
      } else {
        errorCount += 1
      }
    } catch (error) {
      log.error({ err: error, email: user.email }, 'Error processing user')
      errorCount += 1
    }
  }

  log.info({ sentCount, errorCount }, 'Completed')

  return { sentCount, errorCount }
}

export const Route = createFileRoute('/api/cron/verification-reminder')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret(request)

        if (authError) {
          return authError
        }

        try {
          const result = await runVerificationReminders()

          return Response.json({ success: true, ...result })
        } catch (error) {
          log.error({ err: error }, 'Verification reminder cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
