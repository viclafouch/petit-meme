import { captureWithFeature } from '~/lib/sentry'

const matchIsUserCancelError = (error: unknown) => {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'NotAllowedError')
  )
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

const buildShareData = (blob: Blob, title: string, extension: string) => {
  return {
    files: [new File([blob], `${title}.${extension}`, { type: blob.type })],
    title
  } satisfies ShareData
}

export const matchIsBlobShareable = (
  blob: Blob,
  title: string,
  extension: string
) => {
  return (
    'canShare' in navigator &&
    navigator.canShare(buildShareData(blob, title, extension))
  )
}

export async function shareBlob(blob: Blob, title: string, extension = 'mp4') {
  try {
    await navigator.share(buildShareData(blob, title, extension))

    return true
  } catch (error) {
    if (!matchIsUserCancelError(error)) {
      captureWithFeature(error, 'share')
    }

    return false
  }
}
