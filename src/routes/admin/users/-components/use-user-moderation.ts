import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import type { SentryFeature } from '~/lib/sentry'
import { getAdminUserDetailQueryOpts } from '~/routes/admin/-lib/queries'
import {
  BAN_REASONS,
  type BanReason,
  banUserById,
  removeUser,
  unbanUserById
} from '~/routes/admin/-server/users'

export type UserModerationDialog = 'ban' | 'unban' | 'delete'

type ModerationRunParams = {
  userId: string
  banReason: BanReason
}

type ModerationAction = {
  run: (params: ModerationRunParams) => Promise<unknown>
  loading: string
  success: string
  feature: SentryFeature
}

const MODERATION_ACTIONS = {
  ban: {
    run: ({ userId, banReason }) => {
      return banUserById({ data: { userId, banReason } })
    },
    loading: 'Bannissement en cours...',
    success: 'Utilisateur banni',
    feature: 'admin-user-ban'
  },
  unban: {
    run: ({ userId }) => {
      return unbanUserById({ data: userId })
    },
    loading: 'Débannissement en cours...',
    success: 'Utilisateur débanni',
    feature: 'admin-user-unban'
  },
  delete: {
    run: ({ userId }) => {
      return removeUser({ data: userId })
    },
    loading: 'Suppression en cours...',
    success: 'Utilisateur supprimé',
    feature: 'admin-user-delete'
  }
} as const satisfies Record<UserModerationDialog, ModerationAction>

export const NO_MODERATION_REASON = 'Aucune action sur votre propre compte'

type ModerationTarget = {
  id: string
  banned: boolean | null
  role: string | null
}

type UserModerationPermissionsParams = {
  target: ModerationTarget
  adminId: string
}

export function getUserModerationPermissions({
  target,
  adminId
}: UserModerationPermissionsParams) {
  const isOwnAccount = target.id === adminId
  const isTargetAdmin = target.role === 'admin'
  const isBanned = target.banned === true

  return {
    canBan: !isTargetAdmin && !isBanned,
    canUnban: !isTargetAdmin && isBanned,
    canDelete: !isOwnAccount
  }
}

type UseUserModerationParams = {
  userId: string
  onDeleted?: () => void
}

export const useUserModeration = ({
  userId,
  onDeleted
}: UseUserModerationParams) => {
  const [activeDialog, setActiveDialog] =
    React.useState<UserModerationDialog | null>(null)
  const [banReason, setBanReason] = React.useState<BanReason>(BAN_REASONS[0])
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleClose = () => {
    setActiveDialog(null)
  }

  const moderationMutation = useMutation({
    mutationFn: (dialog: UserModerationDialog) => {
      const action = MODERATION_ACTIONS[dialog]
      const promise = action.run({ userId, banReason })

      toast.promise(promise, {
        loading: action.loading,
        success: action.success,
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: (_result, dialog) => {
      handleClose()
      void queryClient.invalidateQueries({
        queryKey: getAdminUserDetailQueryOpts(userId).queryKey
      })
      void router.invalidate()

      if (dialog === 'delete') {
        onDeleted?.()
      }
    },
    onError: (error, dialog) => {
      captureWithFeature(error, MODERATION_ACTIONS[dialog].feature)
    }
  })

  const openDialog = (dialog: UserModerationDialog) => {
    setActiveDialog(dialog)
  }

  const handleConfirm = () => {
    if (activeDialog) {
      moderationMutation.mutate(activeDialog)
    }
  }

  return {
    activeDialog,
    banReason,
    setBanReason,
    openDialog,
    handleClose,
    handleConfirm,
    isPending: moderationMutation.isPending
  }
}
