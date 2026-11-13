import { MEME_FIRST_FRAME_FILE_NAME } from '~/constants/bunny'
import { clientEnv } from '~/env/client'

const buildPublicUrl = (hostname: string, pathname: `/${string}`) => {
  return new URL(pathname, `https://${hostname}`).toString()
}

export const buildVideoImageUrl = (videoId: string) => {
  return buildPublicUrl(
    clientEnv.VITE_BUNNY_HOSTNAME,
    `/${videoId}/thumbnail.jpg`
  )
}

export const buildVideoPreviewUrl = (videoId: string) => {
  return buildPublicUrl(
    clientEnv.VITE_BUNNY_HOSTNAME,
    `/${videoId}/preview.webp`
  )
}

export const buildVideoFirstFrameUrl = (videoId: string) => {
  return buildPublicUrl(
    clientEnv.VITE_BUNNY_IMAGES_HOSTNAME,
    `/${videoId}/${MEME_FIRST_FRAME_FILE_NAME}`
  )
}
