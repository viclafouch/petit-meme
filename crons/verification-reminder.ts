/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { randomBytes, randomUUID } from 'node:crypto'
import { prismaClient } from '@/db'
import { VerificationReminderEmail } from '@/emails/verification-reminder-email'
import { maskEmail } from '@/helpers/mask-email'
import { EMAIL_FROM, getEmailRecipient, resend } from '@/lib/resend.server'

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR
const REMINDER_AFTER_HOURS = 42
const REMINDER_BEFORE_HOURS = 54
const TOKEN_EXPIRY_MS = MS_PER_DAY

const task = async () => {
  const siteUrl = process.env.VITE_SITE_URL

  if (!siteUrl) {
    console.error('VITE_SITE_URL environment variable is required')
    process.exit(1)
  }

  const now = new Date()
  const oldestCreatedAt = new Date(
    now.getTime() - REMINDER_BEFORE_HOURS * MS_PER_HOUR
  )
  const newestCreatedAt = new Date(
    now.getTime() - REMINDER_AFTER_HOURS * MS_PER_HOUR
  )

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
    console.log('No users to remind')
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
        console.error(
          `Failed to send reminder to ${maskEmail(user.email)}:`,
          error
        )
        errorCount += 1
        continue
      }

      await prismaClient.user.update({
        where: { id: user.id },
        data: { verificationReminderSent: true }
      })

      console.log(`Sent reminder to ${maskEmail(user.email)}`)
      sentCount += 1
    } catch (error) {
      console.error(`Error processing user ${maskEmail(user.email)}:`, error)
      errorCount += 1
    }
  }

  console.log(`Done: ${String(sentCount)} sent, ${String(errorCount)} errors`)
  process.exit(errorCount > 0 ? 1 : 0)
}

void task()
