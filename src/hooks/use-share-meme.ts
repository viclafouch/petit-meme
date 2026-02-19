import { toast } from 'sonner'
import type { MemeWithVideo } from '@/constants/meme'
import { shareMeme } from '@/server/meme'
import { shareBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useShareMeme = () => {
  return useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
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
