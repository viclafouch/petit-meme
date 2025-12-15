import { toast } from 'sonner'
import type { Meme } from '@/db/generated/prisma/client'
import { shareMeme } from '@/server/meme'
import { downloadBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useDownloadMeme = () => {
  return useMutation({
    mutationFn: async (meme: Meme) => {
      const response = await shareMeme({ data: meme.id })
      const blob = await response.blob()

      downloadBlob(blob, meme.title)
    },
    onError: () => {
      toast.error('Une erreur s’est produite pendant le téléchargement')
    }
  })
}
