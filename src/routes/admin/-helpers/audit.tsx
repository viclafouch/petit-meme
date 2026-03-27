import type {
  AuditAction,
  AuditMetadata,
  AuditTargetType
} from '~/server/audit'

function getAuditTargetLabel(targetType: AuditTargetType) {
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

    default: {
      return targetType
    }
  }
}

function getAuditActionVerb(action: AuditAction, targetType: AuditTargetType) {
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

    default: {
      return `${label} — ${action}`
    }
  }
}

type FormatAuditEntryParams = {
  action: AuditAction
  targetType: AuditTargetType
  metadata: AuditMetadata | null
}

export function formatAuditEntry({
  action,
  targetType,
  metadata
}: FormatAuditEntryParams) {
  const verb = getAuditActionVerb(action, targetType)
  const data = metadata ?? {}

  if (data.title) {
    return `${verb} : ${data.title}`
  }

  if (data.banReason) {
    return `${verb} (${data.banReason})`
  }

  return verb
}
