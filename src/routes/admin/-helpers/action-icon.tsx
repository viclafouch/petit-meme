import { Ban, Edit, FilePlus, RefreshCw, ShieldOff, Trash2 } from 'lucide-react'
import type { AuditAction } from '~/server/audit'

export function getActionIcon(action: AuditAction) {
  switch (action) {
    case 'create': {
      return <FilePlus className="size-4" aria-hidden />
    }

    case 'edit': {
      return <Edit className="size-4" aria-hidden />
    }

    case 'delete': {
      return <Trash2 className="size-4" aria-hidden />
    }

    case 'ban': {
      return <Ban className="size-4" aria-hidden />
    }

    case 'unban': {
      return <ShieldOff className="size-4" aria-hidden />
    }

    case 'status_change': {
      return <RefreshCw className="size-4" aria-hidden />
    }

    default: {
      return <Edit className="size-4" aria-hidden />
    }
  }
}
