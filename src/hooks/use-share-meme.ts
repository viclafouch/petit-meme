import type { Meme } from '@/db/generated/prisma/client'
import { shareMeme } from '@/server/meme'
import { shareBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const useShareMeme = () => {
  return useMutation({
    mutationFn: async (meme: Meme) => {
      const response = await shareMeme({ data: meme.id })
      const blob = await response.blob()

      shareBlob(blob, meme.title)
    }
  })
}
