import {
  MEME_STORED_FILE_CONTENT_TYPES,
  type MemeDerivedFormat
} from '~/constants/bunny'
import { captureWithFeature } from '~/lib/sentry'

const matchIsUserCancelError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function downloadBlob(blob: Blob, filename: string) {
  const element = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
  element.href = url
  element.download = filename
  document.body.append(element)
  element.click()
  element.remove()
  URL.revokeObjectURL(url)
}

const buildShareData = (
  blob: Blob,
  title: string,
  format: MemeDerivedFormat
) => {
  return {
    files: [
      new File([blob], `${title}.${format}`, {
        type: MEME_STORED_FILE_CONTENT_TYPES[format]
      })
    ],
    title
  } satisfies ShareData
}

export const matchIsBlobShareable = (
  blob: Blob,
  title: string,
  format: MemeDerivedFormat
) => {
  return (
    'canShare' in navigator &&
    navigator.canShare(buildShareData(blob, title, format))
  )
}

export async function shareBlob(
  blob: Blob,
  title: string,
  format: MemeDerivedFormat
) {
  try {
    await navigator.share(buildShareData(blob, title, format))

    return true
  } catch (error) {
    if (!matchIsUserCancelError(error)) {
      captureWithFeature(error, 'share')
    }

    return false
  }
}
