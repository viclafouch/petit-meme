import { createServerFn } from '@tanstack/react-start'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import {
  MEME_PROPOSAL_SCHEMA,
  MAX_PENDING_PROPOSALS
} from '~/constants/meme-proposal'
import { RATE_LIMIT_SUBMIT_MEME } from '~/constants/rate-limit'
import { lockUntilTransactionEnds } from '~/db/advisory-lock.server'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import {
  MemeProposalStatus,
  MemeProposalUrlType
} from '~/db/generated/prisma/enums'
import { matchIsPrismaError } from '~/db/prisma-error.server'
import { proposalLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import {
  getTweetByUrl,
  TweetNoVideoError
} from '~/server/platforms/twitter.server'
import { createUserRateLimitMiddleware } from '~/server/rate-limit/rate-limit.middleware'

const USER_PROPOSAL_SELECT = {
  id: true,
  title: true,
  url: true,
  urlType: true,
  contentLocale: true,
  status: true,
  createdAt: true,
  memeId: true
} as const satisfies Prisma.MemeProposalSelect

export const createProposal = createServerFn({ method: 'POST' })
  .validator((data) => {
    return MEME_PROPOSAL_SCHEMA.parse(data)
  })
  .middleware([createUserRateLimitMiddleware(RATE_LIMIT_SUBMIT_MEME)])
  .handler(async ({ data, context }) => {
    const userId = context.user.id

    if (data.urlType === MemeProposalUrlType.TWEET) {
      try {
        await getTweetByUrl(data.url)
      } catch (error) {
        proposalLogger.warn(
          { userId, url: data.url, error },
          'Tweet video verification failed'
        )
        const isTweetNoVideo = error instanceof TweetNoVideoError

        return throwWithStatus(
          HTTP_STATUS.UNPROCESSABLE_CONTENT,
          new AppError(
            isTweetNoVideo ? 'tweet_no_video' : 'tweet_verification_failed',
            {
              code: isTweetNoVideo
                ? 'TWEET_NO_VIDEO'
                : 'TWEET_VERIFICATION_FAILED'
            }
          )
        )
      }
    }

    try {
      const proposal = await prismaClient.$transaction(async (transaction) => {
        await lockUntilTransactionEnds(transaction, `meme-proposal:${userId}`)

        const pendingCount = await transaction.memeProposal.count({
          where: { userId, status: MemeProposalStatus.PENDING }
        })

        if (pendingCount >= MAX_PENDING_PROPOSALS) {
          proposalLogger.warn(
            { userId, pendingCount },
            'Proposal limit reached'
          )
          return throwWithStatus(
            HTTP_STATUS.UNPROCESSABLE_CONTENT,
            new AppError('proposal_limit_reached', {
              code: 'PROPOSAL_LIMIT_REACHED'
            })
          )
        }

        return transaction.memeProposal.create({
          data: {
            userId,
            title: data.title,
            url: data.url,
            urlType: data.urlType,
            contentLocale: data.contentLocale
          },
          select: USER_PROPOSAL_SELECT
        })
      })

      proposalLogger.info(
        { userId, proposalId: proposal.id, urlType: data.urlType },
        'Meme proposal created'
      )

      return proposal
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      if (matchIsPrismaError(error, 'UNIQUE_CONSTRAINT_FAILED')) {
        proposalLogger.warn(
          { userId, url: data.url },
          'Duplicate URL submitted'
        )
        return throwWithStatus(
          HTTP_STATUS.CONFLICT,
          new AppError('duplicate_url', { code: 'DUPLICATE_URL' })
        )
      }

      captureWithFeature(error, 'meme-submission')
      throw error
    }
  })

export const listUserProposals = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id

    try {
      const [proposals, pendingCount] = await Promise.all([
        prismaClient.memeProposal.findMany({
          where: { userId },
          select: USER_PROPOSAL_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prismaClient.memeProposal.count({
          where: { userId, status: MemeProposalStatus.PENDING }
        })
      ])

      return { proposals, pendingCount }
    } catch (error) {
      captureWithFeature(error, 'meme-submission')
      throw error
    }
  })
