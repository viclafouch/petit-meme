import { StudioError } from '@/constants/error'
import {
  CREATE_MEME_SUBMISSION_SCHEMA,
  MAX_PENDING_SUBMISSIONS
} from '@/constants/meme-submission'
import { RATE_LIMIT_SUBMIT_MEME } from '@/constants/rate-limit'
import { prismaClient } from '@/db'
import { Prisma } from '@/db/generated/prisma/client'
import { MemeSubmissionStatus } from '@/db/generated/prisma/enums'
import { submissionLogger } from '@/lib/logger'
import { captureWithFeature } from '@/lib/sentry'
import { createUserRateLimitMiddleware } from '@/server/rate-limit'
import { authUserRequiredMiddleware } from '@/server/user-auth'
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

    const pendingCount = await prismaClient.memeSubmission.count({
      where: { userId, status: MemeSubmissionStatus.PENDING }
    })

    if (pendingCount >= MAX_PENDING_SUBMISSIONS) {
      setResponseStatus(422)
      throw new StudioError('submission_limit_reached', {
        code: 'SUBMISSION_LIMIT_REACHED'
      })
    }

    try {
      const submission = await prismaClient.memeSubmission.create({
        data: {
          userId,
          title: data.title,
          url: data.url,
          urlType: data.urlType,
          contentLocale: data.contentLocale
        },
        select: SUBMISSION_USER_SELECT
      })

      submissionLogger.info(
        { userId, submissionId: submission.id, urlType: data.urlType },
        'Meme submission created'
      )

      return submission
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
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

    const [submissions, pendingCount] = await Promise.all([
      prismaClient.memeSubmission.findMany({
        where: { userId },
        select: SUBMISSION_USER_SELECT,
        orderBy: { createdAt: 'desc' }
      }),
      prismaClient.memeSubmission.count({
        where: { userId, status: MemeSubmissionStatus.PENDING }
      })
    ])

    return { submissions, pendingCount }
  })
