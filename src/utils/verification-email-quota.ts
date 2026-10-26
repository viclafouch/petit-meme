import { createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import { RATE_LIMIT_VERIFICATION_EMAIL } from '~/constants/rate-limit'
import { authLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const claimSendInOpenWindow = async (userId: string, windowCutoff: Date) => {
  const { count } = await prismaClient.user.updateMany({
    where: {
      id: userId,
      verificationEmailWindowStart: { gt: windowCutoff },
      verificationEmailCount: { lt: RATE_LIMIT_VERIFICATION_EMAIL.maxRequests }
    },
    data: { verificationEmailCount: { increment: 1 } }
  })

  return count > 0
}

const claimSendInNewWindow = async (userId: string, windowCutoff: Date) => {
  const { count } = await prismaClient.user.updateMany({
    where: {
      id: userId,
      OR: [
        { verificationEmailWindowStart: null },
        { verificationEmailWindowStart: { lte: windowCutoff } }
      ]
    },
    data: {
      verificationEmailCount: 1,
      verificationEmailWindowStart: new Date()
    }
  })

  return count > 0
}

export const claimVerificationEmailSend = createServerOnlyFn(
  async (userId: string) => {
    const windowCutoff = new Date(
      Date.now() - RATE_LIMIT_VERIFICATION_EMAIL.windowMs
    )

    try {
      const isClaimed =
        (await claimSendInOpenWindow(userId, windowCutoff)) ||
        (await claimSendInNewWindow(userId, windowCutoff))

      if (!isClaimed) {
        authLogger.warn({ userId }, 'Verification email limit reached')
      }

      return isClaimed
    } catch (error) {
      captureWithFeature(error, 'verification-email-quota')

      return true
    }
  }
)
