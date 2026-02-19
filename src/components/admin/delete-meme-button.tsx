import React from 'react'
import { toast } from 'sonner'
import ConfirmAlert from '@/components/confirm-alert'
import { Button } from '@/components/ui/button'
import type { Meme } from '@/db/generated/prisma/client'
import {
  getAdminMemeByIdQueryOpts,
  getAdminMemesListQueryOpts
} from '@/lib/queries'
import { deleteMemeById } from '@/server/admin'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

type DeleteMemeButtonProps = {
  meme: Meme
} & React.ComponentProps<typeof Button>

export const DeleteMemeButton = ({
  meme,
  ...restButtonProps
}: DeleteMemeButtonProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationKey: ['delete-meme'],
    mutationFn: async (body: { id: string }) => {
      const promise = deleteMemeById({ data: body.id })
      toast.promise(promise, {
        loading: 'Suppression...',
        success: () => {
          return 'Mème supprimé avec succès !'
        }
      })

      return promise
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAdminMemesListQueryOpts.all,
        exact: false
      })
      await queryClient.removeQueries(getAdminMemeByIdQueryOpts(meme.id))
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
    <ConfirmAlert
      title="Supprimer le mème"
      description="Êtes-vous sûr de vouloir supprimer ce mème ?"
      confirmText="Supprimer"
      onConfirm={handleConfirm}
      trigger={
        <Button
          disabled={deleteMutation.isPending}
          type="button"
          variant="destructive"
          {...restButtonProps}
        />
      }
    />
  )
}
