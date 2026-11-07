import { clientEnv } from '~/env/client'

const buildBunnyUrl = (pathname: `/${string}`) => {
  return new URL(
    pathname,
    `https://${clientEnv.VITE_BUNNY_HOSTNAME}`
  ).toString()
}

export const buildVideoImageUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/thumbnail.jpg`)
}

export const buildVideoPreviewUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/preview.webp`)
}
