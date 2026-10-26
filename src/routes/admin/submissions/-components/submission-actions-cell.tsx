import React from 'react'
import {
  Check,
  EllipsisVertical,
  ExternalLink,
  Eye,
  Trash,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ConfirmAlertDialog } from '~/components/confirm-alert-dialog'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { Textarea } from '~/components/ui/textarea'
import {
  MemeSubmissionStatus,
  MemeSubmissionUrlType
} from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminPendingSubmissionCountQueryOpts,
  getAdminSubmissionsQueryOpts
} from '~/routes/admin/-lib/queries'
import { createMemeFromTwitterUrl } from '~/routes/admin/-server/memes'
import {
  type AdminSubmission,
  deleteSubmission,
  updateSubmissionStatus
} from '~/routes/admin/-server/submissions'

type DialogType = 'reject' | 'delete' | 'approve-tweet'

type SubmissionActionsCellProps = {
  submission: AdminSubmission
}

const handleMutationError = (error: Error) => {
  captureWithFeature(error, 'admin-submission')
}

export const SubmissionActionsCell = ({
  submission
}: SubmissionActionsCellProps) => {
  const [activeDialog, setActiveDialog] = React.useState<DialogType | null>(
    null
  )
  const [adminNote, setAdminNote] = React.useState('')
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleCloseDialog = () => {
    setActiveDialog(null)
    setAdminNote('')
  }

  const handleMutationSuccess = () => {
    handleCloseDialog()

    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: getAdminSubmissionsQueryOpts.all
      }),
      queryClient.invalidateQueries({
        queryKey: getAdminPendingSubmissionCountQueryOpts.all
      })
    ])
  }

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const trimmedAdminNote = adminNote.trim()
      const promise = updateSubmissionStatus({
        data: {
          submissionId: submission.id,
          status: MemeSubmissionStatus.REJECTED,
          adminNote: trimmedAdminNote === '' ? undefined : trimmedAdminNote
        }
      })
      toast.promise(promise, {
        loading: 'Rejet en cours...',
        success: 'Soumission rejetée',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: handleMutationError
  })

  const approveTweetMutation = useMutation({
    mutationFn: async () => {
      const createPromise = createMemeFromTwitterUrl({ data: submission.url })
      toast.promise(createPromise, {
        loading: 'Création du mème depuis Twitter...',
        success: 'Mème créé avec succès',
        error: getErrorMessage
      })

      const result = await createPromise

      await updateSubmissionStatus({
        data: {
          submissionId: submission.id,
          status: MemeSubmissionStatus.APPROVED,
          memeId: result.id
        }
      })

      return result
    },
    onSuccess: (result) => {
      void router.navigate({
        to: '/admin/library/$memeId',
        params: { memeId: result.id }
      })

      return handleMutationSuccess()
    },
    onError: handleMutationError
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const promise = deleteSubmission({ data: submission.id })
      toast.promise(promise, {
        loading: 'Suppression en cours...',
        success: 'Soumission supprimée',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleMutationSuccess,
    onError: handleMutationError
  })

  const isPending = submission.status === MemeSubmissionStatus.PENDING
  const isApproved = submission.status === MemeSubmissionStatus.APPROVED
  const isTweet = submission.urlType === MemeSubmissionUrlType.TWEET

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="data-popup-open:bg-muted text-muted-foreground flex ml-auto"
              size="icon"
            />
          }
        >
          <EllipsisVertical />
          <span className="sr-only">Actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLinkItem
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Ouvrir le lien
          </DropdownMenuLinkItem>
          {isApproved && submission.memeId !== null ? (
            <DropdownMenuLinkItem
              render={
                <Link
                  to="/admin/library/$memeId"
                  params={{ memeId: submission.memeId }}
                />
              }
            >
              <Eye className="size-4" aria-hidden="true" />
              Voir le mème
            </DropdownMenuLinkItem>
          ) : null}
          {isPending ? (
            <>
              <DropdownMenuSeparator />
              {isTweet ? (
                <DropdownMenuItem
                  onClick={() => {
                    setActiveDialog('approve-tweet')
                  }}
                >
                  <Check className="size-4" aria-hidden="true" />
                  Approuver (Twitter)
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => {
                  setActiveDialog('reject')
                }}
              >
                <X className="size-4" aria-hidden="true" />
                Rejeter
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setActiveDialog('delete')
            }}
          >
            <Trash className="size-4" aria-hidden="true" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'reject'}
        onClose={handleCloseDialog}
        title={`Rejeter « ${submission.title} »`}
        description="Note optionnelle (non visible par l'utilisateur pour l'instant)."
        actionLabel="Rejeter"
        onConfirm={() => {
          rejectMutation.mutate()
        }}
      >
        <Textarea
          value={adminNote}
          onChange={(event) => {
            setAdminNote(event.target.value)
          }}
          placeholder="Raison du rejet (optionnel)..."
          rows={3}
          maxLength={500}
        />
      </ConfirmAlertDialog>
      <ConfirmAlertDialog
        isOpen={activeDialog === 'approve-tweet'}
        onClose={handleCloseDialog}
        title={`Approuver « ${submission.title} »`}
        description="Le mème sera créé automatiquement depuis le tweet. Vous serez redirigé vers la page d'édition du mème."
        actionLabel="Créer le mème"
        onConfirm={() => {
          approveTweetMutation.mutate()
        }}
      />
      <ConfirmAlertDialog
        isOpen={activeDialog === 'delete'}
        onClose={handleCloseDialog}
        title={`Supprimer « ${submission.title} »`}
        description="Cette action est irréversible. La soumission sera définitivement supprimée."
        actionLabel="Supprimer"
        onConfirm={() => {
          deleteMutation.mutate()
        }}
      />
    </>
  )
}
