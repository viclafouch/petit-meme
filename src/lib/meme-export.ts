import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import {
  sendConversionEvent,
  type ConversionEventName,
  type InsightsTracking
} from '~/lib/algolia-insights'
import { downloadBlob, matchIsBlobShareable, shareBlob } from '~/lib/download'
import {
  getMemeExportFile,
  recordMemeExport
} from '~/server/meme/meme.functions'

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
  const response = await getMemeExportFile({
    data: { memeId: meme.id, mode, format }
  })

  return response.blob()
}

type DeliverMemeExportParams = MemeExportParams & {
  blob: Blob
  tracking: InsightsTracking
}

type ShareOrDownloadBlobParams = {
  blob: Blob
  title: string
  mode: MemeExportMode
  format: MemeDerivedFormat
}

export const shareOrDownloadBlob = async ({
  blob,
  title,
  mode,
  format
}: ShareOrDownloadBlobParams): Promise<MemeExportMode | null> => {
  if (mode === 'share' && matchIsBlobShareable(blob, title, format)) {
    const wasShared = await shareBlob(blob, title, format)

    return wasShared ? 'share' : null
  }

  downloadBlob(blob, `${title}.${format}`)

  return 'download'
}

export const deliverMemeExport = async (params: DeliverMemeExportParams) => {
  const deliveredMode = await shareOrDownloadBlob({
    blob: params.blob,
    title: params.meme.title,
    mode: params.mode,
    format: params.format
  })

  if (deliveredMode === null) {
    return false
  }

  void recordMemeExport({
    data: { memeId: params.meme.id, action: params.mode }
  })
  sendConversionEvent({
    eventName: EXPORT_CONVERSION_EVENT_NAMES[deliveredMode][params.format],
    objectID: params.meme.id,
    ...params.tracking
  })

  return true
}
