import React from 'react'
import {
  Ban,
  SquarePen,
  FilePlus,
  RefreshCw,
  ShieldOff,
  Trash,
  Upload
} from 'lucide-react'
import type { AuditAction } from '~/server/audit'

export function getActionIcon(action: AuditAction) {
  switch (action) {
    case 'create': {
      return <FilePlus className="size-4" aria-hidden />
    }

    case 'edit': {
      return <SquarePen className="size-4" aria-hidden />
    }

    case 'delete': {
      return <Trash className="size-4" aria-hidden />
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

    case 'watermark_upload': {
      return <Upload className="size-4" aria-hidden />
    }

    default: {
      return <SquarePen className="size-4" aria-hidden />
    }
  }
}
