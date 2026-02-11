import { toast } from 'sonner'
import type { Meme } from '@/db/generated/prisma/client'
import { shareMeme } from '@/server/meme'
import { shareBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useShareMeme = () => {
  return useMutation({
    mutationFn: async (meme: Meme) => {
      const blobPromise = shareMeme({ data: meme.id }).then((response) => {
        return response.blob()
      })

      toast.promise(blobPromise, { loading: 'Chargement...' })

      const blob = await blobPromise

      void shareBlob(blob, meme.title)
    },
    onError: () => {
      toast.error('Une erreur s’est produite pendant le partage')
    }
  })
}
