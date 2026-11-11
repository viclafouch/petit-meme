import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Meme } from '~/db/generated/prisma/client'
import {
  getAdminMemeOriginalQueryOpts,
  getMissingMemeFilesQueryOpts
} from '~/queries/admin/meme'
import {
  buildMemeFiles,
  uploadMemeFiles,
  type GenerateMemeFilesHandlers
} from '~/routes/admin/library/-lib/meme-files'

export function useMemeFilesEngine(memeId: Meme['id']) {
  const queryClient = useQueryClient()
  const filesQuery = useQuery(getMissingMemeFilesQueryOpts(memeId))

  const generateFiles = async (handlers: GenerateMemeFilesHandlers) => {
    handlers.onStep('preparing')

    const files = await buildMemeFiles({
      readOriginal: () => {
        return queryClient.query({
          ...getAdminMemeOriginalQueryOpts(memeId),
          staleTime: 'static'
        })
      },
      handlers
    })

    handlers.onStep('uploading')
    await uploadMemeFiles(memeId, files)
  }

  const refreshMissingFiles = () => {
    return queryClient.invalidateQueries(getMissingMemeFilesQueryOpts(memeId))
  }

  return {
    missingFiles: filesQuery.data?.missingFiles,
    generateFiles,
    refreshMissingFiles
  }
}
