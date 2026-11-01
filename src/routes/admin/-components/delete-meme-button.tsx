import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ConfirmAlertDialog } from '~/components/confirm-alert-dialog'
import { Button } from '~/components/ui/button'
import type { Meme } from '~/db/generated/prisma/client'
import { getErrorMessage } from '~/helpers/error'
import type { MemeFile } from '~/lib/meme-files'
import {
  getAdminMemeByIdQueryOpts,
  invalidateAdminMemesOverview
} from '~/routes/admin/-lib/queries'
import { deleteMemeById } from '~/routes/admin/-server/memes'

const MEME_FILE_LABELS = {
  stream: 'la vidéo Bunny Stream',
  mp4: 'le MP4 watermarké',
  mp3: 'le MP3'
} as const satisfies Record<MemeFile, string>

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
    onSuccess: async ({ undeletedFiles }) => {
      setIsDialogOpen(false)

      if (undeletedFiles.length > 0) {
        const labels = undeletedFiles.map((file) => {
          return MEME_FILE_LABELS[file]
        })
        toast.warning(`Bunny n'a pas supprimé : ${labels.join(', ')}`, {
          description: 'Supprime ces fichiers à la main sur Bunny.',
          duration: Infinity
        })
      }

      queryClient.removeQueries(getAdminMemeByIdQueryOpts(meme.id))
      await invalidateAdminMemesOverview(queryClient)
      await router.navigate({ to: '/admin/library' })
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
