import React from 'react'
import { toast } from 'sonner'
import { ConfirmAlertDialog } from '@/components/confirm-alert-dialog'
import { Button } from '@/components/ui/button'
import type { Meme } from '@/db/generated/prisma/client'
import { getErrorMessage } from '@/helpers/error'
import {
  getAdminDashboardTotalsQueryOpts,
  getAdminMemeByIdQueryOpts,
  getAdminMemesListQueryOpts
} from '@admin/-lib/queries'
import { deleteMemeById } from '@admin/-server/memes'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

type DeleteMemeButtonProps = {
  meme: Meme
} & React.ComponentProps<typeof Button>

export const DeleteMemeButton = ({
  meme,
  children,
  ...restButtonProps
}: DeleteMemeButtonProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const deleteMutation = useMutation({
    mutationKey: ['delete-meme'],
    mutationFn: async (body: { id: string }) => {
      const promise = deleteMemeById({ data: body.id })
      toast.promise(promise, {
        loading: 'Suppression...',
        success: () => {
          return 'Mème supprimé avec succès !'
        },
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: async () => {
      setIsDialogOpen(false)
      await queryClient.invalidateQueries({
        queryKey: getAdminMemesListQueryOpts.all,
        exact: false
      })
      await queryClient.removeQueries(getAdminMemeByIdQueryOpts(meme.id))
      void queryClient.invalidateQueries({
        queryKey: getAdminDashboardTotalsQueryOpts.all
      })
      void router.navigate({ to: '/admin/library' })
    }
  })

  const handleConfirm = () => {
    if (deleteMutation.isPending) {
      return
    }

    deleteMutation.mutate({ id: meme.id })
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setIsDialogOpen(true)
        }}
        {...restButtonProps}
      >
        {children}
      </Button>
      <ConfirmAlertDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
        }}
        title="Supprimer le mème"
        description="Êtes-vous sûr de vouloir supprimer ce mème ?"
        actionLabel="Supprimer"
        onConfirm={handleConfirm}
      />
    </>
  )
}
