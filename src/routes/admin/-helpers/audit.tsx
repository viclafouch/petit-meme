import type { AuditMetadata } from '~/server/admin/audit/audit.server'

const FEMININE_TARGET_TYPES = new Set(['category', 'proposal'])

function getAuditTargetLabel(targetType: string) {
  switch (targetType) {
    case 'category': {
      return 'Catégorie'
    }

    case 'meme': {
      return 'Meme'
    }

    case 'user': {
      return 'Utilisateur'
    }

    case 'proposal': {
      return 'Proposition'
    }

    default: {
      return targetType
    }
  }
}

type AuditActionVerbParams = {
  action: string
  targetType: string
}

function getAuditActionVerb({ action, targetType }: AuditActionVerbParams) {
  const label = getAuditTargetLabel(targetType)

  switch (action) {
    case 'create': {
      return `${label} créé${FEMININE_TARGET_TYPES.has(targetType) ? 'e' : ''}`
    }

    case 'edit': {
      return `${label} modifié${FEMININE_TARGET_TYPES.has(targetType) ? 'e' : ''}`
    }

    case 'delete': {
      return `${label} supprimé${FEMININE_TARGET_TYPES.has(targetType) ? 'e' : ''}`
    }

    case 'ban': {
      return 'Utilisateur banni'
    }

    case 'unban': {
      return 'Utilisateur débanni'
    }

    case 'status_change': {
      return 'Statut modifié'
    }

    case 'watermark_upload': {
      return 'Watermark uploadé'
    }

    case 'premium_grant': {
      return 'Premium offert'
    }

    case 'premium_revoke': {
      return 'Premium retiré'
    }

    default: {
      return `${label} ${action}`
    }
  }
}

type FormatAuditEntryParams = {
  action: string
  targetType: string
  metadata: AuditMetadata
}

export function formatAuditEntry({
  action,
  targetType,
  metadata
}: FormatAuditEntryParams) {
  const verb = getAuditActionVerb({ action, targetType })

  if (metadata.title) {
    return `${verb} : ${metadata.title}`
  }

  if (metadata.banReason) {
    return `${verb} (${metadata.banReason})`
  }

  return verb
}
