/* eslint-disable no-await-in-loop */
import { randomBytes, randomUUID } from 'node:crypto'
import { DAY, HOUR } from '@/constants/time'
import { prismaClient } from '@/db'
import { VerificationReminderEmail } from '@/emails/verification-reminder-email'
import { cronLogger } from '@/lib/logger'
import { EMAIL_FROM, getEmailRecipient, resend } from '@/lib/resend'

const log = cronLogger.child({ job: 'verification-reminder' })

const REMINDER_AFTER_HOURS = 42
const REMINDER_BEFORE_HOURS = 54
const TOKEN_EXPIRY_MS = DAY

const task = async () => {
  const siteUrl = process.env.VITE_SITE_URL

  if (!siteUrl) {
    log.fatal('VITE_SITE_URL environment variable is required')
    process.exit(1)
  }

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
    process.exit(0)
  }

  let sentCount = 0
  let errorCount = 0

  for (const user of users) {
    try {
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

      const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/')}`

      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: getEmailRecipient(user.email),
        subject: 'Rappel : confirme ton email Petit Mème',
        react: VerificationReminderEmail({
          username: user.name,
          verificationUrl
        })
      })

      if (error) {
        log.error({ err: error, email: user.email }, 'Failed to send reminder')
        errorCount += 1
        continue
      }

      await prismaClient.user.update({
        where: { id: user.id },
        data: { verificationReminderSent: true }
      })

      log.info({ email: user.email }, 'Sent reminder')
      sentCount += 1
    } catch (error) {
      log.error({ err: error, email: user.email }, 'Error processing user')
      errorCount += 1
    }
  }

  log.info({ sentCount, errorCount }, 'Completed')
  process.exit(errorCount > 0 ? 1 : 0)
}

void task()
