import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import { PLACEHOLDER_EMAIL_DOMAIN } from '~/constants/auth'
import { HOUR, ONE_DAY_IN_SECONDS } from '~/constants/time'
import type { UserLocale } from '~/db/generated/prisma/client'
import { emailSubjects } from '~/emails/subjects'
import { VerificationReminderEmail } from '~/emails/verification-reminder-email'
import { clientEnv } from '~/env/client'
import { serverEnv } from '~/env/server'
import { cronLogger } from '~/lib/logger'
import { getEmailFrom, getEmailRecipient, getResendClient } from '~/lib/resend'
import { verifyCronSecret } from '~/utils/cron-auth'
import { buildEmailVerificationPath } from '~/utils/email-verification'

const log = cronLogger.child({ job: 'verification-reminder' })

const REMINDER_AFTER_HOURS = 42
const REMINDER_BEFORE_HOURS = 54
const TOKEN_EXPIRY_IN_SECONDS = ONE_DAY_IN_SECONDS

const sendReminderToUser = async (user: {
  id: string
  email: string
  name: string | null
  locale: UserLocale
}) => {
  const verificationPath = await buildEmailVerificationPath({
    email: user.email,
    secret: serverEnv.BETTER_AUTH_SECRET,
    expiresInSeconds: TOKEN_EXPIRY_IN_SECONDS
  })
  const verificationUrl = `${clientEnv.VITE_SITE_URL}${verificationPath}`
  const { error } = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: getEmailRecipient(user.email),
    subject: emailSubjects[user.locale].verificationReminder,
    react: VerificationReminderEmail({
      username: user.name ?? 'there',
      verificationUrl,
      locale: user.locale
    })
  })

  if (error) {
    log.error({ error, email: user.email }, 'Failed to send reminder')

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
      email: { not: { endsWith: `.${PLACEHOLDER_EMAIL_DOMAIN}` } },
      createdAt: {
        gte: oldestCreatedAt,
        lte: newestCreatedAt
      }
    },
    select: { id: true, email: true, name: true, locale: true }
  })

  if (users.length === 0) {
    log.info('No users to remind')

    return { sentCount: 0, errorCount: 0 }
  }

  let sentCount = 0
  let errorCount = 0

  for (const user of users) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- reminders go out one at a time on purpose, never as a burst against Resend
      const isSent = await sendReminderToUser(user)

      if (isSent) {
        sentCount += 1
      } else {
        errorCount += 1
      }
    } catch (error) {
      log.error({ error, email: user.email }, 'Error processing user')
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
          log.error({ error }, 'Verification reminder cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})
