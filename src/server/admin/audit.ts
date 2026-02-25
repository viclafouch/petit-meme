import { prismaClient } from '@/db'
import type { Prisma } from '@/db/generated/prisma/client'
import { adminLogger } from '@/lib/logger'

type AuditAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'ban'
  | 'unban'
  | 'status_change'

type AuditTargetType = 'category' | 'meme' | 'user'

type LogAuditActionParams = {
  action: AuditAction
  actingAdminId: string
  targetId: string
  targetType: AuditTargetType
  metadata?: Prisma.InputJsonObject
}

export const logAuditAction = async ({
  action,
  actingAdminId,
  targetId,
  targetType,
  metadata
}: LogAuditActionParams) => {
  try {
    await prismaClient.adminAuditLog.create({
      data: {
        action,
        actingAdminId,
        targetId,
        targetType,
        metadata: metadata ?? {}
      }
    })
  } catch (error) {
    adminLogger.error(
      { err: error, action, actingAdminId, targetId, targetType },
      'Failed to write audit log'
    )
  }
}
