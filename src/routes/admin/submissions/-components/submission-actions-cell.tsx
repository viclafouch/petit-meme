import React from 'react'
import {
  Check,
  EllipsisVertical,
  ExternalLink,
  Eye,
  Trash2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmAlertDialog } from '@/components/confirm-alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import {
  MemeSubmissionStatus,
  MemeSubmissionUrlType
} from '@/db/generated/prisma/enums'
import { getErrorMessage } from '@/helpers/error'
import { captureWithFeature } from '@/lib/sentry'
import {
  getAdminPendingSubmissionCountQueryOpts,
  getAdminSubmissionsQueryOpts
} from '@admin/-lib/queries'
import { createMemeFromTwitterUrl } from '@admin/-server/memes'
import type { AdminSubmission } from '@admin/-server/submissions'
import {
  deleteSubmission,
  updateSubmissionStatus
} from '@admin/-server/submissions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

type DialogType = 'reject' | 'delete' | 'approve-tweet'

type SubmissionActionsCellParams = {
  submission: AdminSubmission
}

export const SubmissionActionsCell = ({
  submission
}: SubmissionActionsCellParams) => {
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

  const invalidateSubmissions = () => {
    void queryClient.invalidateQueries({
      queryKey: getAdminSubmissionsQueryOpts.all
    })
    void queryClient.invalidateQueries({
      queryKey: getAdminPendingSubmissionCountQueryOpts.all
    })
  }

  const handleMutationSuccess = () => {
    handleCloseDialog()
    invalidateSubmissions()
    void router.invalidate()
  }

  const handleMutationError = (error: Error) => {
    captureWithFeature(error, 'admin-submission')
  }

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const promise = updateSubmissionStatus({
        data: {
          submissionId: submission.id,
          status: MemeSubmissionStatus.REJECTED,
          adminNote: adminNote.trim() || undefined
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
      handleCloseDialog()
      invalidateSubmissions()
      void router.invalidate()
      void router.navigate({
        to: '/admin/library/$memeId',
        params: { memeId: result.id }
      })
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
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-9 ml-auto"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <a href={submission.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Ouvrir le lien
            </a>
          </DropdownMenuItem>
          {isApproved && submission.memeId ? (
            <DropdownMenuItem asChild>
              <Link
                to="/admin/library/$memeId"
                params={{ memeId: submission.memeId }}
              >
                <Eye className="size-4" aria-hidden />
                Voir le mème
              </Link>
            </DropdownMenuItem>
          ) : null}
          {isPending ? (
            <>
              <DropdownMenuSeparator />
              {isTweet ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setActiveDialog('approve-tweet')
                  }}
                >
                  <Check className="size-4" aria-hidden />
                  Approuver (Twitter)
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={() => {
                  setActiveDialog('reject')
                }}
              >
                <X className="size-4" aria-hidden />
                Rejeter
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setActiveDialog('delete')
            }}
          >
            <Trash2 className="size-4" aria-hidden />
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
