import { expect, type Page } from '@playwright/test'

type ShareAttempt = {
  title: string
  fileName: string
  type: string
  sha256Bytes: number[]
  isEmpty: boolean
}

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- widening the DOM `Window` is declaration merging, which only an interface does
  interface Window {
    e2eShareAttempts: ShareAttempt[]
  }
}

const CHROMIUM_SHAREABLE_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'audio/flac',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/webp',
  'image/x-icon',
  'image/x-ms-bmp',
  'image/x-xbitmap',
  'text/comma-separated-values',
  'text/css',
  'text/csv',
  'text/html',
  'text/plain',
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'video/webm'
]

type RecordSharesParams = {
  page: Page
  isFileShareable?: boolean
}

export const recordShares = async ({
  page,
  isFileShareable = true
}: RecordSharesParams) => {
  await page.addInitScript(
    ({ isShareable, shareableMimeTypes }) => {
      window.e2eShareAttempts = []

      navigator.canShare = () => {
        return isShareable
      }

      navigator.share = async (data) => {
        const [file] = data?.files ?? []

        window.e2eShareAttempts = [
          ...window.e2eShareAttempts,
          {
            title: data?.title ?? '',
            fileName: file?.name ?? '',
            type: file?.type ?? '',
            sha256Bytes: file
              ? [
                  ...new Uint8Array(
                    await crypto.subtle.digest(
                      'SHA-256',
                      await file.arrayBuffer()
                    )
                  )
                ]
              : [],
            isEmpty: (file?.size ?? 0) === 0
          }
        ]

        const isEveryFileShareable = (data?.files ?? []).every((sharedFile) => {
          return shareableMimeTypes.includes(sharedFile.type)
        })

        if (!isEveryFileShareable) {
          throw new DOMException('Permission denied', 'NotAllowedError')
        }
      }
    },
    {
      isShareable: isFileShareable,
      shareableMimeTypes: CHROMIUM_SHAREABLE_MIME_TYPES
    }
  )
}

const WHOLE_FILE_PROXY_GIVE_UP_MS = 15_000

export const readShareAttempt = async (page: Page) => {
  await expect
    .poll(
      () => {
        return page.evaluate(() => {
          return window.e2eShareAttempts.length
        })
      },
      { timeout: WHOLE_FILE_PROXY_GIVE_UP_MS }
    )
    .toBe(1)

  const [shareAttempt] = await page.evaluate(() => {
    return window.e2eShareAttempts
  })

  if (!shareAttempt) {
    throw new Error('The page attempted no share')
  }

  const { sha256Bytes, ...attempt } = shareAttempt

  return { ...attempt, sha256: Buffer.from(sha256Bytes).toString('hex') }
}
