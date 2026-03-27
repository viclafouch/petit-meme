import React from 'react'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmAlertDialog } from '~/components/confirm-alert-dialog'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { getErrorMessage } from '~/helpers/error'
import * as Sentry from '@sentry/tanstackstart-react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Route } from '../index'

import {
  BAN_REASONS,
  type BanReason,
  banUserById,
  type EnrichedUser,
  removeUser,
  unbanUserById
} from '~admin/-server/users'

type DialogType = 'ban' | 'unban' | 'delete'

type UserActionsCellParams = {
  user: EnrichedUser
}

export const UserActionsCell = ({ user }: UserActionsCellParams) => {
  const [activeDialog, setActiveDialog] = React.useState<DialogType | null>(
    null
  )
  const [banReason, setBanReason] = React.useState<BanReason>(BAN_REASONS[0])
  const router = useRouter()
  const { user: admin } = Route.useRouteContext()

  const handleCloseDialog = () => {
    setActiveDialog(null)
  }

  const handleMutationSuccess = () => {
    handleCloseDialog()
    void router.invalidate()
  }

  const handleMutationError = (
    error: Error,
    feature: 'admin-user-ban' | 'admin-user-unban' | 'admin-user-delete'
  ) => {
    Sentry.captureException(error, { tags: { feature } })
  }

  const banMutation = useMutation({
    mutationFn: async () => {
      const promise = banUserById({
        data: { userId: user.id, banReason }
      })
      toast.promise(promise, {
        loading: 'Bannissement en cours...',
        success: 'Utilisateur banni',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-ban')
    }
  })

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const promise = unbanUserById({ data: user.id })
      toast.promise(promise, {
        loading: 'Débannissement en cours...',
        success: 'Utilisateur débanni',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-unban')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const promise = removeUser({ data: user.id })
      toast.promise(promise, {
        loading: 'Suppression en cours...',
        success: 'Utilisateur supprimé',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: (error) => {
      handleMutationError(error, 'admin-user-delete')
    }
  })

  const isOwnAccount = user.id === admin.id
  const isTargetAdmin = user.role === 'admin'
  const hasActions = !isOwnAccount || !isTargetAdmin

  if (!hasActions) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex ml-auto"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {!isTargetAdmin && user.banned ? (
            <DropdownMenuItem
              onSelect={() => {
                setActiveDialog('unban')
              }}
            >
              Débannir
            </DropdownMenuItem>
          ) : null}
          {!isTargetAdmin && !user.banned ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setActiveDialog('ban')
              }}
            >
              Bannir
            </DropdownMenuItem>
          ) : null}
          {!isOwnAccount ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setActiveDialog('delete')
              }}
            >
              Supprimer
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'ban'}
        onClose={handleCloseDialog}
        title={`Bannir ${user.name}`}
        description="Choisissez une raison pour le bannissement."
        actionLabel="Bannir"
        onConfirm={() => {
          banMutation.mutate()
        }}
      >
        <Select
          value={banReason}
          onValueChange={(value) => {
            setBanReason(value as BanReason)
          }}
        >
          <SelectTrigger aria-label="Raison du bannissement">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAN_REASONS.map((reason) => {
              return (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </ConfirmAlertDialog>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'unban'}
        onClose={handleCloseDialog}
        title={`Débannir ${user.name}`}
        description="L'utilisateur pourra de nouveau accéder à la plateforme."
        actionLabel="Débannir"
        onConfirm={() => {
          unbanMutation.mutate()
        }}
      />
      <ConfirmAlertDialog
        isOpen={activeDialog === 'delete'}
        onClose={handleCloseDialog}
        title={`Supprimer ${user.name}`}
        description="Cette action est irréversible. Toutes les données de l'utilisateur seront supprimées."
        actionLabel="Supprimer"
        onConfirm={() => {
          deleteMutation.mutate()
        }}
      />
    </>
  )
}
