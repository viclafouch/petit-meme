import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BAN_REASONS, type BanReason } from '~/constants/ban'
import { getErrorMessage } from '~/helpers/error'
import { getPremiumStatus, type SubscriptionInfo } from '~/helpers/premium'
import { matchIsPremiumGranted } from '~/helpers/role'
import { captureWithFeature, type SentryFeature } from '~/lib/sentry'
import {
  getAdminUserQueryOpts,
  listAdminUsersQueryOpts,
  getAdminUserSubscriptionHistoryQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  banUser,
  grantPremium,
  deleteUser,
  revokePremium,
  unbanUser
} from '~/server/admin/user/user.functions'

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
      return banUser({ data: { userId, banReason } })
    },
    loading: 'Bannissement en cours...',
    success: 'Utilisateur banni',
    feature: 'admin-user-ban'
  },
  unban: {
    run: ({ userId }) => {
      return unbanUser({ data: userId })
    },
    loading: 'Débannissement en cours...',
    success: 'Utilisateur débanni',
    feature: 'admin-user-unban'
  },
  delete: {
    run: ({ userId }) => {
      return deleteUser({ data: userId })
    },
    loading: 'Suppression en cours...',
    success: 'Utilisateur supprimé',
    feature: 'admin-user-delete'
  },
  grantPremium: {
    run: ({ userId }) => {
      return grantPremium({ data: userId })
    },
    loading: 'Activation de Premium...',
    success: 'Premium offert',
    feature: 'admin-user-premium'
  },
  revokePremium: {
    run: ({ userId }) => {
      return revokePremium({ data: userId })
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
        queryKey: listAdminUsersQueryOpts.all
      })

      if (dialog === 'delete') {
        onDeleted?.()

        return usersListInvalidation
      }

      return Promise.all([
        usersListInvalidation,
        queryClient.invalidateQueries(getAdminUserQueryOpts(userId)),
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
