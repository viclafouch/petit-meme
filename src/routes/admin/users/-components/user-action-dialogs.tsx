import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { BAN_REASONS } from '~/constants/ban'
import { ConfirmAlertDialog } from '~/routes/admin/-components/confirm-alert-dialog'
import type { useUserActions } from './use-user-actions'

type UserActionDialogsProps = {
  userName: string
  userActions: ReturnType<typeof useUserActions>
}

export const UserActionDialogs = ({
  userName,
  userActions
}: UserActionDialogsProps) => {
  return (
    <>
      <ConfirmAlertDialog
        isOpen={userActions.activeDialog === 'ban'}
        onClose={userActions.handleClose}
        title={`Bannir ${userName}`}
        description="Choisissez une raison pour le bannissement."
        actionLabel="Bannir"
        onConfirm={userActions.handleConfirm}
      >
        <Select
          value={userActions.banReason}
          onValueChange={(value) => {
            if (value !== null) {
              userActions.setBanReason(value)
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
        isOpen={userActions.activeDialog === 'unban'}
        onClose={userActions.handleClose}
        title={`Débannir ${userName}`}
        description="L'utilisateur pourra de nouveau accéder à la plateforme."
        actionLabel="Débannir"
        onConfirm={userActions.handleConfirm}
      />
      <ConfirmAlertDialog
        isOpen={userActions.activeDialog === 'delete'}
        onClose={userActions.handleClose}
        title={`Supprimer ${userName}`}
        description="Cette action est irréversible. Toutes les données de l'utilisateur, y compris son activité, seront supprimées."
        actionLabel="Supprimer"
        onConfirm={userActions.handleConfirm}
      />
      <ConfirmAlertDialog
        isOpen={userActions.activeDialog === 'grantPremium'}
        onClose={userActions.handleClose}
        title={`Offrir Premium à ${userName}`}
        description="Premium reste actif à vie, sans paiement, jusqu'à ce que vous le retiriez. Un email prévient l'utilisateur."
        actionLabel="Offrir Premium"
        onConfirm={userActions.handleConfirm}
      />
      <ConfirmAlertDialog
        isOpen={userActions.activeDialog === 'revokePremium'}
        onClose={userActions.handleClose}
        title={`Retirer Premium à ${userName}`}
        description="L'utilisateur repasse sur le plan gratuit. Aucun email n'est envoyé."
        actionLabel="Retirer Premium"
        onConfirm={userActions.handleConfirm}
      />
    </>
  )
}
