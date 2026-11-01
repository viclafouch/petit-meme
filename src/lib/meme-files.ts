import { createServerOnlyFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { serverEnv } from '~/env/server'
import { buildSignedOriginalUrl, deleteVideo } from '~/lib/bunny'
import { bunnyLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const STORAGE_TIMEOUT_MS = 15_000
const STORAGE_UPLOAD_TIMEOUT_MS = 120_000

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

const fetchWithHeadersTimeout = async (url: string, init: RequestInit = {}) => {
  const headersController = new AbortController()
  const headersTimeoutId = setTimeout(() => {
    headersController.abort()
  }, STORAGE_TIMEOUT_MS)

  try {
    return await fetch(url, { ...init, signal: headersController.signal })
  } finally {
    clearTimeout(headersTimeoutId)
  }
}

const fetchMemeFile = async (bunnyId: string, format: MemeDerivedFormat) => {
  const response = await fetchWithHeadersTimeout(
    buildMemeFileUrl(bunnyId, format),
    { headers: getStorageHeaders() }
  )

  if (!response.ok) {
    throw new Error(`Bunny Storage responded with status ${response.status}`)
  }

  return response
}

const buildMemeFileProxyResponse = (
  upstream: Response,
  contentType: string
) => {
  const headers: HeadersInit = {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  }

  const contentLength = upstream.headers.get('Content-Length')

  if (contentLength) {
    headers['Content-Length'] = contentLength
  }

  return new Response(upstream.body, { headers })
}

const fetchOriginalVideo = async (bunnyId: string) => {
  const response = await fetchWithHeadersTimeout(
    await buildSignedOriginalUrl(bunnyId)
  )

  if (!response.ok) {
    setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
    throw new Error(`Bunny CDN responded with status ${response.status}`)
  }

  return response
}

const fetchVideoExport = async (bunnyId: string, isPremium: boolean) => {
  if (isPremium) {
    return fetchOriginalVideo(bunnyId)
  }

  try {
    return await fetchMemeFile(bunnyId, 'mp4')
  } catch (error) {
    captureWithFeature(error, 'watermark-fallback')
    bunnyLogger.warn(
      { bunnyId, error },
      'Watermark fallback: serving original video'
    )

    return fetchOriginalVideo(bunnyId)
  }
}

type ServeMemeExportParams = {
  bunnyId: string
  format: MemeDerivedFormat
  isPremium: boolean
}

export const serveMemeExport = createServerOnlyFn(
  async ({ bunnyId, format, isPremium }: ServeMemeExportParams) => {
    if (format === 'mp4') {
      const response = await fetchVideoExport(bunnyId, isPremium)

      return buildMemeFileProxyResponse(
        response,
        response.headers.get('Content-Type') ?? 'video/mp4'
      )
    }

    if (!isPremium) {
      setResponseStatus(HTTP_STATUS.FORBIDDEN)
      throw new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
    }

    const response = await fetchMemeFile(bunnyId, format)

    return buildMemeFileProxyResponse(response, 'audio/mpeg')
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

export const findMissingMemeFiles = createServerOnlyFn(
  async (bunnyId: string) => {
    const presence = await Promise.all(
      MEME_DERIVED_FORMATS.map(async (format) => {
        return { format, exists: await checkMemeFileExists(bunnyId, format) }
      })
    )

    return presence.flatMap(({ format, exists }) => {
      return exists ? [] : [format]
    })
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
