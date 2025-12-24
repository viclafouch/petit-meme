import { toast } from 'sonner'
import type { Meme } from '@/db/generated/prisma/client'
import { shareMeme } from '@/server/meme'
import { downloadBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useDownloadMeme = () => {
  return useMutation({
    mutationFn: async (meme: Meme) => {
      const blobPromise = shareMeme({ data: meme.id }).then((response) => {
        return response.blob()
      })

      toast.promise(blobPromise, { loading: 'Chargement...' })

      const blob = await blobPromise

      downloadBlob(blob, meme.title)
    },
    onError: () => {
      toast.error('Une erreur s’est produite pendant le téléchargement')
    }
  })
}
