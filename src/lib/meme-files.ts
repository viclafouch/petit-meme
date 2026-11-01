import { createServerOnlyFn } from '@tanstack/react-start'
import { HTTP_STATUS } from '~/constants/http'
import { serverEnv } from '~/env/server'
import { deleteVideo } from '~/lib/bunny'
import { bunnyLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const STORAGE_TIMEOUT_MS = 15_000
const STORAGE_UPLOAD_TIMEOUT_MS = 120_000

const MEME_DERIVED_FORMATS = ['mp4', 'mp3'] as const satisfies readonly string[]

export type MemeDerivedFormat = (typeof MEME_DERIVED_FORMATS)[number]

export type MemeFile = 'stream' | MemeDerivedFormat

const MEME_FILES = [
  'stream',
  ...MEME_DERIVED_FORMATS
] as const satisfies readonly MemeFile[]

export const buildMemeFileUrl = createServerOnlyFn(
  (bunnyId: string, format: MemeDerivedFormat) => {
    return `https://${serverEnv.BUNNY_STORAGE_HOSTNAME}/${serverEnv.BUNNY_STORAGE_ZONE_NAME}/${bunnyId}.${format}`
  }
)

const getStorageHeaders = () => {
  return new Headers({ AccessKey: serverEnv.BUNNY_STORAGE_API_KEY })
}

export const fetchMemeFile = createServerOnlyFn(
  async (bunnyId: string, format: MemeDerivedFormat) => {
    const headersController = new AbortController()
    const headersTimeoutId = setTimeout(() => {
      headersController.abort()
    }, STORAGE_TIMEOUT_MS)

    try {
      const response = await fetch(buildMemeFileUrl(bunnyId, format), {
        headers: getStorageHeaders(),
        signal: headersController.signal
      })

      if (!response.ok) {
        throw new Error(
          `Bunny Storage responded with status ${response.status}`
        )
      }

      return response
    } finally {
      clearTimeout(headersTimeoutId)
    }
  }
)

export const uploadMemeFile = createServerOnlyFn(
  async (
    bunnyId: string,
    format: MemeDerivedFormat,
    fileBuffer: Buffer<ArrayBuffer>
  ) => {
    const headers = getStorageHeaders()
    headers.set('Content-Type', 'application/octet-stream')

    const response = await fetch(buildMemeFileUrl(bunnyId, format), {
      method: 'PUT',
      headers,
      body: fileBuffer,
      signal: AbortSignal.timeout(STORAGE_UPLOAD_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(
        `Bunny Storage upload failed with status ${response.status}`
      )
    }

    bunnyLogger.info(
      { bunnyId, format, sizeBytes: fileBuffer.length },
      'Meme file uploaded to Storage'
    )
  }
)

export const checkMemeFileExists = createServerOnlyFn(
  async (bunnyId: string, format: MemeDerivedFormat) => {
    const headers = getStorageHeaders()
    headers.set('Range', 'bytes=0-0')

    const response = await fetch(buildMemeFileUrl(bunnyId, format), {
      headers,
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS)
    })

    if (response.status === HTTP_STATUS.NOT_FOUND) {
      return false
    }

    if (!response.ok) {
      throw new Error(
        `Bunny Storage exists check failed with status ${response.status}`
      )
    }

    return true
  }
)

const deleteMemeFile = async (bunnyId: string, format: MemeDerivedFormat) => {
  const response = await fetch(buildMemeFileUrl(bunnyId, format), {
    method: 'DELETE',
    headers: getStorageHeaders(),
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS)
  })

  if (!response.ok && response.status !== HTTP_STATUS.NOT_FOUND) {
    throw new Error(
      `Bunny Storage delete failed with status ${response.status}`
    )
  }

  bunnyLogger.info({ bunnyId, format }, 'Meme file deleted from Storage')
}

const deleteOrReportMemeFile = async (bunnyId: string, file: MemeFile) => {
  try {
    await (file === 'stream'
      ? deleteVideo(bunnyId)
      : deleteMemeFile(bunnyId, file))

    return null
  } catch (error) {
    captureWithFeature(error, 'bunny-cleanup')
    bunnyLogger.error({ error, bunnyId, file }, 'Failed to delete a Meme file')

    return file
  }
}

export const deleteMemeFiles = createServerOnlyFn(async (bunnyId: string) => {
  const undeletedFiles = await Promise.all(
    MEME_FILES.map((file) => {
      return deleteOrReportMemeFile(bunnyId, file)
    })
  )

  return undeletedFiles.filter((file) => {
    return file !== null
  })
})
