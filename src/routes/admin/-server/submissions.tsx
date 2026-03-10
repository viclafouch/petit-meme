import { z } from 'zod'
import { prismaClient } from '@/db'
import { Prisma } from '@/db/generated/prisma/client'
import { MemeSubmissionStatus } from '@/db/generated/prisma/enums'
import { emailSubjects } from '@/emails/subjects'
import { SubmissionApprovedEmail } from '@/emails/submission-approved-email'
import { SubmissionRejectedEmail } from '@/emails/submission-rejected-email'
import { submissionLogger } from '@/lib/logger'
import { sendEmailAsync } from '@/lib/resend'
import { captureWithFeature } from '@/lib/sentry'
import { logAuditAction } from '@/server/audit'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

const SUBMISSION_ADMIN_SELECT = {
  id: true,
  title: true,
  url: true,
  urlType: true,
  contentLocale: true,
  status: true,
  adminNote: true,
  memeId: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true
    }
  }
} as const satisfies Prisma.MemeSubmissionSelect

export type AdminSubmission = Prisma.MemeSubmissionGetPayload<{
  select: typeof SUBMISSION_ADMIN_SELECT
}>

const ADMIN_SUBMISSION_STATUS_FILTER_SCHEMA = z
  .enum(MemeSubmissionStatus)
  .optional()

export const getAdminSubmissions = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return ADMIN_SUBMISSION_STATUS_FILTER_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: statusFilter }) => {
    const where: Prisma.MemeSubmissionWhereInput = statusFilter
      ? { status: statusFilter }
      : {}

    try {
      const [submissions, countsByStatus] = await Promise.all([
        prismaClient.memeSubmission.findMany({
          where,
          select: SUBMISSION_ADMIN_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 200
        }),
        prismaClient.memeSubmission.groupBy({
          by: ['status'],
          _count: { _all: true }
        })
      ])

      const statusCounts = countsByStatus.reduce<
        Record<MemeSubmissionStatus, number>
      >(
        (accumulator, row) => {
          return { ...accumulator, [row.status]: row._count._all }
        },
        {
          [MemeSubmissionStatus.PENDING]: 0,
          [MemeSubmissionStatus.APPROVED]: 0,
          [MemeSubmissionStatus.REJECTED]: 0
        }
      )

      return { submissions, statusCounts }
    } catch (error) {
      captureWithFeature(error, 'admin-submission')
      throw error
    }
  })

const UPDATE_SUBMISSION_STATUS_SCHEMA = z.discriminatedUnion('status', [
  z.object({
    submissionId: z.string(),
    status: z.literal(MemeSubmissionStatus.APPROVED),
    memeId: z.string()
  }),
  z.object({
    submissionId: z.string(),
    status: z.literal(MemeSubmissionStatus.REJECTED),
    adminNote: z.string().max(500).optional()
  })
])

export const updateSubmissionStatus = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return UPDATE_SUBMISSION_STATUS_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const submission = await prismaClient.$transaction(async (tx) => {
      const found = await tx.memeSubmission.findUnique({
        where: { id: data.submissionId },
        select: {
          id: true,
          status: true,
          title: true,
          userId: true,
          user: { select: { email: true, name: true, locale: true } }
        }
      })

      if (!found) {
        setResponseStatus(404)
        throw new Error('Submission not found')
      }

      if (found.status !== MemeSubmissionStatus.PENDING) {
        setResponseStatus(422)
        throw new Error(
          'Seules les soumissions en attente peuvent être modifiées'
        )
      }

      const updateData: Prisma.MemeSubmissionUpdateInput =
        data.status === MemeSubmissionStatus.APPROVED
          ? {
              status: MemeSubmissionStatus.APPROVED,
              meme: { connect: { id: data.memeId } }
            }
          : {
              status: MemeSubmissionStatus.REJECTED,
              adminNote: data.adminNote ?? null
            }

      try {
        await tx.memeSubmission.update({
          where: { id: data.submissionId },
          data: updateData
        })
      } catch (error) {
        captureWithFeature(error, 'admin-submission')
        throw error
      }

      return found
    })

    if (data.status === MemeSubmissionStatus.APPROVED) {
      sendEmailAsync({
        to: submission.user.email,
        subject: emailSubjects[submission.user.locale].submissionApproved,
        react: (
          <SubmissionApprovedEmail
            username={submission.user.name}
            memeTitle={submission.title}
            memeId={data.memeId}
            locale={submission.user.locale}
          />
        ),
        logMessage: 'Sending submission approved email'
      })
    } else {
      sendEmailAsync({
        to: submission.user.email,
        subject: emailSubjects[submission.user.locale].submissionRejected,
        react: (
          <SubmissionRejectedEmail
            username={submission.user.name}
            memeTitle={submission.title}
            locale={submission.user.locale}
          />
        ),
        logMessage: 'Sending submission rejected email'
      })
    }

    void logAuditAction({
      action: 'status_change',
      actingAdminId: context.user.id,
      targetId: submission.id,
      targetType: 'submission',
      metadata: {
        title: submission.title,
        from: MemeSubmissionStatus.PENDING,
        to: data.status
      }
    })

    submissionLogger.info(
      {
        submissionId: submission.id,
        status: data.status,
        adminId: context.user.id
      },
      `Submission ${data.status.toLowerCase()}`
    )

    return { success: true }
  })

export const deleteSubmission = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: submissionId, context }) => {
    const submission = await prismaClient.memeSubmission
      .delete({
        where: { id: submissionId },
        select: { id: true, title: true, userId: true }
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          setResponseStatus(404)
          throw new Error('Submission not found')
        }

        captureWithFeature(error, 'admin-submission')
        throw error
      })

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: submission.id,
      targetType: 'submission',
      metadata: { title: submission.title }
    })

    submissionLogger.info(
      { submissionId: submission.id, adminId: context.user.id },
      'Submission deleted'
    )

    return { success: true }
  })

export const getAdminPendingSubmissionCount = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    return prismaClient.memeSubmission.count({
      where: { status: MemeSubmissionStatus.PENDING }
    })
  })
