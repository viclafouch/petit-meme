import { prismaClient } from '~/db'
import { adminLogger } from '~/lib/logger'

export type AuditAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'ban'
  | 'unban'
  | 'status_change'
  | 'watermark_upload'

export type AuditTargetType = 'category' | 'meme' | 'submission' | 'user'

export type AuditMetadata = {
  title?: string
  slug?: string
  banReason?: string
  from?: string
  to?: string
  source?: string
}

type LogAuditActionParams = {
  action: AuditAction
  actingAdminId: string
  targetId: string
  targetType: AuditTargetType
  metadata?: AuditMetadata
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
