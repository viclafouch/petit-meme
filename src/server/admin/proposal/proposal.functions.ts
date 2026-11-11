import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import {
  MemeProposalStatus,
  type UserLocale
} from '~/db/generated/prisma/enums'
import { matchIsPrismaError } from '~/db/prisma-error.server'
import { ProposalApprovedEmail } from '~/emails/proposal-approved-email'
import { ProposalRejectedEmail } from '~/emails/proposal-rejected-email'
import { emailSubjects } from '~/emails/subjects'
import { proposalLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { logAuditAction } from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import { sendEmailInBackground } from '~/server/platforms/resend.server'

const ADMIN_NOTE_MAX_LENGTH = 500

const PROPOSAL_ADMIN_SELECT = {
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
} as const satisfies Prisma.MemeProposalSelect

export type AdminProposal = Prisma.MemeProposalGetPayload<{
  select: typeof PROPOSAL_ADMIN_SELECT
}>

const ADMIN_PROPOSAL_STATUS_FILTER_SCHEMA = z
  .enum(MemeProposalStatus)
  .optional()

export const listAdminProposals = createServerFn({ method: 'GET' })
  .validator((data) => {
    return ADMIN_PROPOSAL_STATUS_FILTER_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: statusFilter }) => {
    const where: Prisma.MemeProposalWhereInput =
      statusFilter === undefined ? {} : { status: statusFilter }

    try {
      const [proposals, countsByStatus] = await Promise.all([
        prismaClient.memeProposal.findMany({
          where,
          select: PROPOSAL_ADMIN_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 200
        }),
        prismaClient.memeProposal.groupBy({
          by: ['status'],
          _count: { _all: true }
        })
      ])

      const statusCounts: Record<MemeProposalStatus, number> = {
        [MemeProposalStatus.PENDING]: 0,
        [MemeProposalStatus.APPROVED]: 0,
        [MemeProposalStatus.REJECTED]: 0
      }

      for (const row of countsByStatus) {
        statusCounts[row.status] = row._count._all
      }

      return { proposals, statusCounts }
    } catch (error) {
      captureWithFeature(error, 'admin-submission')
      throw error
    }
  })

const throwProposalNotFound = () => {
  return throwWithStatus(
    HTTP_STATUS.NOT_FOUND,
    new Error('Proposition introuvable')
  )
}

const UPDATE_PROPOSAL_STATUS_SCHEMA = z.discriminatedUnion('status', [
  z.object({
    proposalId: z.string(),
    status: z.literal(MemeProposalStatus.APPROVED),
    memeId: z.string()
  }),
  z.object({
    proposalId: z.string(),
    status: z.literal(MemeProposalStatus.REJECTED),
    adminNote: z.string().max(ADMIN_NOTE_MAX_LENGTH).optional()
  })
])

type ProposalStatusUpdate = z.infer<typeof UPDATE_PROPOSAL_STATUS_SCHEMA>

type SettledProposal = {
  title: string
  user: { name: string; locale: UserLocale }
}

const buildProposalSettledEmail = (
  update: ProposalStatusUpdate,
  { title, user }: SettledProposal
) => {
  if (update.status === MemeProposalStatus.APPROVED) {
    return {
      subject: emailSubjects[user.locale].proposalApproved,
      react: ProposalApprovedEmail({
        username: user.name,
        memeTitle: title,
        memeId: update.memeId,
        locale: user.locale
      }),
      logMessage: 'Sending proposal approved email'
    }
  }

  return {
    subject: emailSubjects[user.locale].proposalRejected,
    react: ProposalRejectedEmail({
      username: user.name,
      memeTitle: title,
      locale: user.locale
    }),
    logMessage: 'Sending proposal rejected email'
  }
}

export const updateProposalStatus = createServerFn({ method: 'POST' })
  .validator((data) => {
    return UPDATE_PROPOSAL_STATUS_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const proposal = await prismaClient.$transaction(async (transaction) => {
      const found = await transaction.memeProposal.findUnique({
        where: { id: data.proposalId },
        select: {
          id: true,
          status: true,
          title: true,
          userId: true,
          user: { select: { email: true, name: true, locale: true } }
        }
      })

      if (!found) {
        return throwProposalNotFound()
      }

      if (found.status !== MemeProposalStatus.PENDING) {
        return throwWithStatus(
          HTTP_STATUS.UNPROCESSABLE_CONTENT,
          new Error('Seule une proposition en attente peut être modifiée')
        )
      }

      const updateData: Prisma.MemeProposalUpdateInput =
        data.status === MemeProposalStatus.APPROVED
          ? {
              status: MemeProposalStatus.APPROVED,
              meme: { connect: { id: data.memeId } }
            }
          : {
              status: MemeProposalStatus.REJECTED,
              adminNote: data.adminNote ?? null
            }

      try {
        await transaction.memeProposal.update({
          where: { id: data.proposalId },
          data: updateData
        })
      } catch (error) {
        captureWithFeature(error, 'admin-submission')
        throw error
      }

      return found
    })

    sendEmailInBackground({
      to: proposal.user.email,
      ...buildProposalSettledEmail(data, proposal)
    })

    void logAuditAction({
      action: 'status_change',
      actingAdminId: context.user.id,
      targetId: proposal.id,
      targetType: 'proposal',
      metadata: {
        title: proposal.title,
        from: MemeProposalStatus.PENDING,
        to: data.status
      }
    })

    proposalLogger.info(
      {
        proposalId: proposal.id,
        status: data.status,
        adminId: context.user.id
      },
      `Proposal ${data.status.toLowerCase()}`
    )

    return { success: true }
  })

export const deleteProposal = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: proposalId, context }) => {
    const proposal = await prismaClient.memeProposal
      .delete({
        where: { id: proposalId },
        select: { id: true, title: true, userId: true }
      })
      .catch((error: unknown) => {
        if (matchIsPrismaError(error, 'RECORD_NOT_FOUND')) {
          return throwProposalNotFound()
        }

        captureWithFeature(error, 'admin-submission')
        throw error
      })

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: proposal.id,
      targetType: 'proposal',
      metadata: { title: proposal.title }
    })

    proposalLogger.info(
      { proposalId: proposal.id, adminId: context.user.id },
      'Proposal deleted'
    )

    return { success: true }
  })

export const countAdminPendingProposals = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    return prismaClient.memeProposal.count({
      where: { status: MemeProposalStatus.PENDING }
    })
  })
