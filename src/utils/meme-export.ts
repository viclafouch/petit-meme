import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import {
  sendConversionEvent,
  type ConversionEventName,
  type InsightsTracking
} from '~/lib/algolia-insights'
import { shareMeme, trackMemeAction } from '~/server/meme'
import { downloadBlob, matchIsBlobShareable, shareBlob } from '~/utils/download'

export type ExportableMeme = Pick<MemeWithVideo, 'id' | 'title'>

const EXPORT_CONVERSION_EVENT_NAMES = {
  download: { mp4: 'Meme MP4 Downloaded', mp3: 'Meme MP3 Downloaded' },
  share: { mp4: 'Meme MP4 Shared', mp3: 'Meme MP3 Shared' }
} as const satisfies Record<
  MemeExportMode,
  Record<MemeDerivedFormat, ConversionEventName>
>

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
  tracking: InsightsTracking
}

const shareOrDownloadBlob = async ({
  blob,
  meme,
  mode,
  format
}: DeliverMemeExportParams): Promise<MemeExportMode | null> => {
  if (mode === 'share' && matchIsBlobShareable(blob, meme.title, format)) {
    const wasShared = await shareBlob(blob, meme.title, format)

    return wasShared ? 'share' : null
  }

  downloadBlob(blob, `${meme.title}.${format}`)

  return 'download'
}

export const deliverMemeExport = async (params: DeliverMemeExportParams) => {
  const deliveredMode = await shareOrDownloadBlob(params)

  if (deliveredMode === null) {
    return false
  }

  void trackMemeAction({
    data: { memeId: params.meme.id, action: params.mode }
  })
  sendConversionEvent({
    eventName: EXPORT_CONVERSION_EVENT_NAMES[deliveredMode][params.format],
    objectID: params.meme.id,
    ...params.tracking
  })

  return true
}
