import { captureWithFeature } from '@/lib/sentry'

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
  document.body.appendChild(element)
  element.click()
  element.remove()
  URL.revokeObjectURL(url)
}

export async function shareBlob(blob: Blob, title: string, extension = 'mp4') {
  const data: ShareData = {
    files: [new File([blob], `${title}.${extension}`, { type: blob.type })],
    title
  }

  try {
    await navigator.share(data)

    return true
  } catch (error) {
    if (!matchIsUserCancelError(error)) {
      captureWithFeature(error, 'share')
    }

    return false
  }
}
