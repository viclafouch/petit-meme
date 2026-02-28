import { toast } from 'sonner'
import type { MemeWithVideo } from '@/constants/meme'
import { getErrorMessage } from '@/helpers/error'
import { captureWithFeature } from '@/lib/sentry'
import { shareMeme, trackMemeAction } from '@/server/meme'
import { downloadBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useDownloadMeme = () => {
  return useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
      const blobPromise = shareMeme({ data: meme.id }).then((response) => {
        return response.blob()
      })

      toast.promise(blobPromise, {
        loading: 'Chargement...',
        error: getErrorMessage
      })

      const blob = await blobPromise

      downloadBlob(blob, meme.title)

      void trackMemeAction({ data: { memeId: meme.id, action: 'download' } })
    },
    onError: (error) => {
      captureWithFeature(error, 'download')
    }
  })
}
