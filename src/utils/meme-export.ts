import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { shareMeme, trackMemeAction } from '~/server/meme'
import { downloadBlob, matchIsBlobShareable, shareBlob } from '~/utils/download'

export type ExportableMeme = Pick<MemeWithVideo, 'id' | 'title'>

type MemeExportParams = {
  meme: ExportableMeme
  mode: MemeExportMode
  format: MemeDerivedFormat
}

export const fetchMemeExport = async ({
  meme,
  mode,
  format
}: MemeExportParams) => {
  const response = await shareMeme({
    data: { memeId: meme.id, mode, format }
  })

  return response.blob()
}

type DeliverMemeExportParams = MemeExportParams & {
  blob: Blob
}

const shareOrDownloadBlob = async ({
  blob,
  meme,
  mode,
  format
}: DeliverMemeExportParams) => {
  if (mode === 'share' && matchIsBlobShareable(blob, meme.title, format)) {
    return shareBlob(blob, meme.title, format)
  }

  downloadBlob(blob, `${meme.title}.${format}`)

  return true
}

export const deliverMemeExport = async (params: DeliverMemeExportParams) => {
  const wasDelivered = await shareOrDownloadBlob(params)

  if (wasDelivered) {
    void trackMemeAction({
      data: { memeId: params.meme.id, action: params.mode }
    })
  }

  return wasDelivered
}
