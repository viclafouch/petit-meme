import { ConfirmAlertDialog } from '~/components/confirm-alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { BAN_REASONS } from '~/routes/admin/-lib/ban'
import type { useUserModeration } from './use-user-moderation'

type UserModerationDialogsProps = {
  userName: string
  moderation: ReturnType<typeof useUserModeration>
}

export const UserModerationDialogs = ({
  userName,
  moderation
}: UserModerationDialogsProps) => {
  return (
    <>
      <ConfirmAlertDialog
        isOpen={moderation.activeDialog === 'ban'}
        onClose={moderation.handleClose}
        title={`Bannir ${userName}`}
        description="Choisissez une raison pour le bannissement."
        actionLabel="Bannir"
        onConfirm={moderation.handleConfirm}
      >
        <Select
          value={moderation.banReason}
          onValueChange={(value) => {
            if (value !== null) {
              moderation.setBanReason(value)
            }
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
        isOpen={moderation.activeDialog === 'unban'}
        onClose={moderation.handleClose}
        title={`Débannir ${userName}`}
        description="L'utilisateur pourra de nouveau accéder à la plateforme."
        actionLabel="Débannir"
        onConfirm={moderation.handleConfirm}
      />
      <ConfirmAlertDialog
        isOpen={moderation.activeDialog === 'delete'}
        onClose={moderation.handleClose}
        title={`Supprimer ${userName}`}
        description="Cette action est irréversible. Toutes les données de l'utilisateur, y compris son activité, seront supprimées."
        actionLabel="Supprimer"
        onConfirm={moderation.handleConfirm}
      />
    </>
  )
}
