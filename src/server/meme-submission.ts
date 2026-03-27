import { StudioError } from '~/constants/error'
import {
  CREATE_MEME_SUBMISSION_SCHEMA,
  MAX_PENDING_SUBMISSIONS
} from '~/constants/meme-submission'
import { RATE_LIMIT_SUBMIT_MEME } from '~/constants/rate-limit'
import { prismaClient } from '~/db'
import { Prisma } from '~/db/generated/prisma/client'
import {
  MemeSubmissionStatus,
  MemeSubmissionUrlType
} from '~/db/generated/prisma/enums'
import { submissionLogger } from '~/lib/logger'
import { getTweetByUrl, TweetNoVideoError } from '~/lib/react-tweet'
import { captureWithFeature } from '~/lib/sentry'
import { createUserRateLimitMiddleware } from '~/server/rate-limit'
import { authUserRequiredMiddleware } from '~/server/user-auth'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

const SUBMISSION_USER_SELECT = {
  id: true,
  title: true,
  url: true,
  urlType: true,
  contentLocale: true,
  status: true,
  createdAt: true,
  memeId: true
} as const satisfies Prisma.MemeSubmissionSelect

export const createMemeSubmission = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return CREATE_MEME_SUBMISSION_SCHEMA.parse(data)
  })
  .middleware([createUserRateLimitMiddleware(RATE_LIMIT_SUBMIT_MEME)])
  .handler(async ({ data, context }) => {
    const userId = context.user.id

    if (data.urlType === MemeSubmissionUrlType.TWEET) {
      try {
        await getTweetByUrl(data.url)
      } catch (error) {
        submissionLogger.warn(
          { userId, url: data.url, err: error },
          'Tweet video verification failed'
        )
        setResponseStatus(422)

        const isTweetNoVideo = error instanceof TweetNoVideoError

        throw new StudioError(
          isTweetNoVideo ? 'tweet_no_video' : 'tweet_verification_failed',
          {
            code: isTweetNoVideo
              ? 'TWEET_NO_VIDEO'
              : 'TWEET_VERIFICATION_FAILED'
          }
        )
      }
    }

    try {
      const submission = await prismaClient.$transaction(async (tx) => {
        const pendingCount = await tx.memeSubmission.count({
          where: { userId, status: MemeSubmissionStatus.PENDING }
        })

        if (pendingCount >= MAX_PENDING_SUBMISSIONS) {
          submissionLogger.warn(
            { userId, pendingCount },
            'Submission limit reached'
          )
          setResponseStatus(422)
          throw new StudioError('submission_limit_reached', {
            code: 'SUBMISSION_LIMIT_REACHED'
          })
        }

        return tx.memeSubmission.create({
          data: {
            userId,
            title: data.title,
            url: data.url,
            urlType: data.urlType,
            contentLocale: data.contentLocale
          },
          select: SUBMISSION_USER_SELECT
        })
      })

      submissionLogger.info(
        { userId, submissionId: submission.id, urlType: data.urlType },
        'Meme submission created'
      )

      return submission
    } catch (error) {
      if (error instanceof StudioError) {
        throw error
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        submissionLogger.warn(
          { userId, url: data.url },
          'Duplicate URL submitted'
        )
        setResponseStatus(409)
        throw new StudioError('duplicate_url', { code: 'DUPLICATE_URL' })
      }

      captureWithFeature(error, 'meme-submission')
      throw error
    }
  })

export const getUserSubmissions = createServerFn({ method: 'GET' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id

    try {
      const [submissions, pendingCount] = await Promise.all([
        prismaClient.memeSubmission.findMany({
          where: { userId },
          select: SUBMISSION_USER_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prismaClient.memeSubmission.count({
          where: { userId, status: MemeSubmissionStatus.PENDING }
        })
      ])

      return { submissions, pendingCount }
    } catch (error) {
      captureWithFeature(error, 'meme-submission')
      throw error
    }
  })
