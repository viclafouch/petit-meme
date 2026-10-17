import type { AuditMetadata } from '~/server/audit'

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

    case 'submission': {
      return 'Soumission'
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
      return `${label} créé${targetType === 'category' ? 'e' : ''}`
    }

    case 'edit': {
      return `${label} modifié${targetType === 'category' ? 'e' : ''}`
    }

    case 'delete': {
      return `${label} supprimé${targetType === 'category' ? 'e' : ''}`
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
