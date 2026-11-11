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

const fetchMemeExport = async ({ meme, mode, format }: MemeExportParams) => {
  const response = await getMemeExportFile({
    data: { memeId: meme.id, mode, format }
  })

  return response.blob()
}

type ExportMemeParams = MemeExportParams & {
  tracking: InsightsTracking
  onFileRequested?: (filePromise: Promise<Blob>) => void
}

type DeliverMemeBlobParams = {
  blob: Blob
  title: string
  mode: MemeExportMode
  format: MemeDerivedFormat
}

export const deliverMemeBlob = async ({
  blob,
  title,
  mode,
  format
}: DeliverMemeBlobParams): Promise<MemeExportMode | null> => {
  if (mode === 'share' && matchIsBlobShareable(blob, title, format)) {
    const wasShared = await shareBlob(blob, title, format)

    return wasShared ? 'share' : null
  }

  downloadBlob(blob, `${title}.${format}`)

  return 'download'
}

export const exportMeme = async ({
  meme,
  mode,
  format,
  tracking,
  onFileRequested
}: ExportMemeParams) => {
  const filePromise = fetchMemeExport({ meme, mode, format })

  onFileRequested?.(filePromise)

  const deliveredMode = await deliverMemeBlob({
    blob: await filePromise,
    title: meme.title,
    mode,
    format
  })

  if (deliveredMode === null) {
    return false
  }

  void recordMemeExport({ data: { memeId: meme.id, action: mode } })
  sendConversionEvent({
    eventName: EXPORT_CONVERSION_EVENT_NAMES[deliveredMode][format],
    objectID: meme.id,
    ...tracking
  })

  return true
}
