import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MemeFullData } from '~/constants/meme'
import {
  getAdminMemeOriginalQueryOpts,
  getMissingMemeFilesQueryOpts
} from '~/queries/admin/meme'
import {
  buildMemeFiles,
  uploadMemeFiles,
  type GenerateMemeFilesHandlers
} from '~/routes/admin/library/-lib/meme-files'

export function useMemeFilesEngine(meme: Pick<MemeFullData, 'id' | 'video'>) {
  const queryClient = useQueryClient()
  const filesQuery = useQuery(getMissingMemeFilesQueryOpts(meme.id))

  const generateFiles = async (handlers: GenerateMemeFilesHandlers) => {
    handlers.onStep('preparing')

    const files = await buildMemeFiles({
      bunnyId: meme.video.bunnyId,
      readOriginal: () => {
        return queryClient.query({
          ...getAdminMemeOriginalQueryOpts(meme.id),
          staleTime: 'static'
        })
      },
      handlers
    })

    handlers.onStep('uploading')
    await uploadMemeFiles(meme.id, files)
  }

  const refreshMissingFiles = () => {
    return queryClient.invalidateQueries(getMissingMemeFilesQueryOpts(meme.id))
  }

  return {
    missingFiles: filesQuery.data?.missingFiles,
    generateFiles,
    refreshMissingFiles
  }
}
