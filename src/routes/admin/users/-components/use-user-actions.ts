import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '~/helpers/error'
import { matchIsPremiumGranted } from '~/lib/role'
import { captureWithFeature, type SentryFeature } from '~/lib/sentry'
import { BAN_REASONS, type BanReason } from '~/routes/admin/-lib/ban'
import {
  getPremiumStatus,
  type SubscriptionInfo
} from '~/routes/admin/-lib/premium'
import {
  getAdminUserDetailQueryOpts,
  getAdminUsersListQueryOpts,
  getAdminUserSubscriptionHistoryQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  banUserById,
  grantPremiumById,
  removeUser,
  revokePremiumById,
  unbanUserById
} from '~/routes/admin/-server/users'

export type UserActionDialog =
  | 'ban'
  | 'unban'
  | 'delete'
  | 'grantPremium'
  | 'revokePremium'

type UserActionRunParams = {
  userId: string
  banReason: BanReason
}

type UserActionResult = {
  success: boolean
}

type UserAction = {
  run: (params: UserActionRunParams) => Promise<UserActionResult>
  loading: string
  success: string
  feature: SentryFeature
}

const USER_ACTIONS = {
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
  },
  grantPremium: {
    run: ({ userId }) => {
      return grantPremiumById({ data: userId })
    },
    loading: 'Activation de Premium...',
    success: 'Premium offert',
    feature: 'admin-user-premium'
  },
  revokePremium: {
    run: ({ userId }) => {
      return revokePremiumById({ data: userId })
    },
    loading: 'Retrait de Premium...',
    success: 'Premium retiré',
    feature: 'admin-user-premium'
  }
} as const satisfies Record<UserActionDialog, UserAction>

export const NO_USER_ACTION_REASON = 'Aucune action sur votre propre compte'

type UserActionTarget = {
  id: string
  banned: boolean | null
  role: string | null
  premiumGrantedAt: Date | null
  subscription: Pick<SubscriptionInfo, 'state'>
}

type UserActionPermissionsParams = {
  target: UserActionTarget
  adminId: string
}

export function getUserActionPermissions({
  target,
  adminId
}: UserActionPermissionsParams) {
  const isOwnAccount = target.id === adminId
  const isTargetAdmin = target.role === 'admin'
  const isBanned = target.banned === true
  const premiumSource = getPremiumStatus(target).source

  return {
    canBan: !isTargetAdmin && !isBanned,
    canUnban: !isTargetAdmin && isBanned,
    canDelete: !isOwnAccount,
    canGrantPremium: !isTargetAdmin && !isBanned && premiumSource === 'none',
    isGrantPremiumBlockedByPayment: !isTargetAdmin && premiumSource === 'paid',
    canRevokePremium: matchIsPremiumGranted(target)
  }
}

type UseUserActionsParams = {
  userId: string
  onDeleted?: () => void
}

export const useUserActions = ({ userId, onDeleted }: UseUserActionsParams) => {
  const [activeDialog, setActiveDialog] =
    React.useState<UserActionDialog | null>(null)
  const [banReason, setBanReason] = React.useState<BanReason>(BAN_REASONS[0])
  const queryClient = useQueryClient()

  const handleClose = () => {
    setActiveDialog(null)
  }

  const userActionMutation = useMutation({
    mutationFn: (dialog: UserActionDialog) => {
      const action = USER_ACTIONS[dialog]
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
      const usersListInvalidation = queryClient.invalidateQueries({
        queryKey: getAdminUsersListQueryOpts.all
      })

      if (dialog === 'delete') {
        onDeleted?.()

        return usersListInvalidation
      }

      return Promise.all([
        usersListInvalidation,
        queryClient.invalidateQueries(getAdminUserDetailQueryOpts(userId)),
        queryClient.invalidateQueries(
          getAdminUserSubscriptionHistoryQueryOpts(userId)
        )
      ])
    },
    onError: (error, dialog) => {
      captureWithFeature(error, USER_ACTIONS[dialog].feature)
    }
  })

  const openDialog = (dialog: UserActionDialog) => {
    setActiveDialog(dialog)
  }

  const handleConfirm = () => {
    if (activeDialog !== null) {
      userActionMutation.mutate(activeDialog)
    }
  }

  return {
    activeDialog,
    banReason,
    setBanReason,
    openDialog,
    handleClose,
    handleConfirm,
    isPending: userActionMutation.isPending
  }
}
