import { createServerOnlyFn } from '@tanstack/react-start'
import { AppError, type AppErrorCode } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import { buildCapState, type CapKind } from '~/helpers/cap'
import { truncateToUtcMonth } from '~/helpers/date'
import type { SessionUser } from '~/helpers/role'
import { throwWithStatus } from '~/server/http/http.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

type FindCapStateParams = {
  user: SessionUser
  kind: CapKind
}

type CapReachedError = {
  status: (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]
  message: string
  code: AppErrorCode
}

const COUNT_CAP_USE = {
  bookmark: (userId) => {
    return prismaClient.bookmark.count({ where: { userId } })
  },
  generation: async (userId) => {
    const { generationCount } = await prismaClient.user.findUniqueOrThrow({
      where: { id: userId },
      select: { generationCount: true }
    })

    return generationCount
  },
  aiSearch: (userId) => {
    return prismaClient.aiSearchLog.count({
      where: { userId, createdAt: { gte: truncateToUtcMonth(new Date()) } }
    })
  }
} as const satisfies Record<CapKind, (userId: string) => Promise<number>>

const PREMIUM_REQUIRED_ERROR = {
  status: HTTP_STATUS.FORBIDDEN,
  message: 'premium_required',
  code: 'PREMIUM_REQUIRED'
} as const satisfies CapReachedError

const CAP_REACHED_ERRORS = {
  bookmark: PREMIUM_REQUIRED_ERROR,
  generation: PREMIUM_REQUIRED_ERROR,
  aiSearch: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'ai_search_quota_exceeded',
    code: 'AI_SEARCH_QUOTA_EXCEEDED'
  }
} as const satisfies Record<CapKind, CapReachedError>

export const findCapState = createServerOnlyFn(
  async ({ user, kind }: FindCapStateParams) => {
    const [usedCount, isPremium] = await Promise.all([
      COUNT_CAP_USE[kind](user.id),
      matchIsUserPremium(user)
    ])

    return buildCapState({ kind, usedCount, isPremium })
  }
)

export const throwCapReached = (kind: CapKind) => {
  const { status, message, code } = CAP_REACHED_ERRORS[kind]

  return throwWithStatus(status, new AppError(message, { code }))
}
