import { createServerOnlyFn } from '@tanstack/react-start'
import { del, get, issueSignedToken, presignUrl } from '@vercel/blob'
import {
  BUNNY_STORAGE_ENDPOINT,
  MEME_DERIVED_FORMAT_CONTENT_TYPES,
  MEME_DERIVED_FORMATS,
  type MemeDerivedFormat
} from '~/constants/bunny'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { MAX_SIZE_MEME_FILE_IN_BYTES } from '~/constants/meme'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { serverEnv } from '~/env/server.server'
import { bunnyLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { throwWithStatus } from '~/server/http/http.server'
import {
  deleteVideo,
  fetchOriginalVideo
} from '~/server/platforms/bunny.server'

const STORAGE_TIMEOUT_MS = 15_000
const STORAGE_UPLOAD_TIMEOUT_MS = 120_000

export type MemeFile = 'stream' | MemeDerivedFormat

const MEME_FILES = [
  'stream',
  ...MEME_DERIVED_FORMATS
] as const satisfies readonly MemeFile[]

const buildMemeFileUrl = createServerOnlyFn(
  (bunnyId: string, format: MemeDerivedFormat) => {
    return `${BUNNY_STORAGE_ENDPOINT}/${serverEnv.BUNNY_STORAGE_ZONE_NAME}/${bunnyId}.${format}`
  }
)

const getStorageHeaders = () => {
  return new Headers({ AccessKey: serverEnv.BUNNY_STORAGE_API_KEY })
}

const fetchWithHeadersTimeout = async (
  sendRequest: (signal: AbortSignal) => Promise<Response>
) => {
  const headersController = new AbortController()
  const headersTimeoutId = setTimeout(() => {
    headersController.abort()
  }, STORAGE_TIMEOUT_MS)

  try {
    return await sendRequest(headersController.signal)
  } finally {
    clearTimeout(headersTimeoutId)
  }
}

const fetchMemeFile = async (bunnyId: string, format: MemeDerivedFormat) => {
  const response = await fetchWithHeadersTimeout((signal) => {
    return fetch(buildMemeFileUrl(bunnyId, format), {
      headers: getStorageHeaders(),
      signal
    })
  })

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

const fetchOriginalForExport = async (bunnyId: string) => {
  const response = await fetchWithHeadersTimeout((signal) => {
    return fetchOriginalVideo(bunnyId, { signal })
  })

  if (!response.ok) {
    return throwWithStatus(
      HTTP_STATUS.BAD_GATEWAY,
      new Error(`Bunny CDN responded with status ${response.status}`)
    )
  }

  return response
}

const fetchVideoExport = async (bunnyId: string, isPremium: boolean) => {
  if (isPremium) {
    return fetchOriginalForExport(bunnyId)
  }

  try {
    return await fetchMemeFile(bunnyId, 'mp4')
  } catch (error) {
    captureWithFeature(error, 'watermark-fallback')
    bunnyLogger.warn(
      { bunnyId, error },
      'Watermark fallback: serving original video'
    )

    return fetchOriginalForExport(bunnyId)
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
      return throwWithStatus(
        HTTP_STATUS.FORBIDDEN,
        new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
      )
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

const buildMemeFileBlobPathname = (
  bunnyId: string,
  format: MemeDerivedFormat
) => {
  return `meme-files/${bunnyId}.${format}`
}

export const presignMemeFileUpload = createServerOnlyFn(
  async (bunnyId: string, format: MemeDerivedFormat) => {
    const pathname = buildMemeFileBlobPathname(bunnyId, format)
    const allowedContentTypes = [MEME_DERIVED_FORMAT_CONTENT_TYPES[format]]
    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      allowedContentTypes,
      maximumSizeInBytes: MAX_SIZE_MEME_FILE_IN_BYTES,
      validUntil: Date.now() + FIVE_MINUTES_MS
    })
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'put',
      pathname,
      access: 'private',
      allowedContentTypes,
      maximumSizeInBytes: MAX_SIZE_MEME_FILE_IN_BYTES,
      allowOverwrite: true,
      addRandomSuffix: false
    })

    return presignedUrl
  }
)

export const moveMemeFileFromBlobToStorage = createServerOnlyFn(
  async (bunnyId: string, format: MemeDerivedFormat) => {
    const pathname = buildMemeFileBlobPathname(bunnyId, format)
    const result = await get(pathname, { access: 'private', useCache: false })

    if (result?.statusCode !== HTTP_STATUS.OK) {
      throw new Error(`Meme file ${pathname} is missing from Vercel Blob`)
    }

    const fileBuffer = Buffer.from(
      await new Response(result.stream).arrayBuffer()
    )

    await uploadMemeFile(bunnyId, format, fileBuffer)
    await del(pathname)
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
