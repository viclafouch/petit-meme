import { toast } from 'sonner'
import type { MemeWithVideo } from '@/constants/meme'
import { getErrorMessage } from '@/helpers/error'
import { captureWithFeature } from '@/lib/sentry'
import { m } from '@/paraglide/messages.js'
import { shareMeme, trackMemeAction } from '@/server/meme'
import { shareBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useShareMeme = () => {
  return useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
      const blobPromise = shareMeme({ data: meme.id }).then((response) => {
        return response.blob()
      })

      toast.promise(blobPromise, {
        loading: m.common_loading(),
        error: getErrorMessage
      })

      const blob = await blobPromise

      await shareBlob(blob, meme.title)

      void trackMemeAction({ data: { memeId: meme.id, action: 'share' } })
    },
    onError: (error) => {
      captureWithFeature(error, 'share')
    }
  })
}
