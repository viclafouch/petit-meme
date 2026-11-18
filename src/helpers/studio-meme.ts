import type { StudioMeme } from '~/constants/studio'

const FALLBACK_WIDTH = 1280
const FALLBACK_HEIGHT = 720

type MemeWithVideoSize = {
  id: string
  title: string
  video: { bunnyId: string; width: number | null; height: number | null }
}

export const toStudioMeme = (meme: MemeWithVideoSize): StudioMeme => {
  return {
    id: meme.id,
    title: meme.title,
    bunnyId: meme.video.bunnyId,
    width: meme.video.width ?? FALLBACK_WIDTH,
    height: meme.video.height ?? FALLBACK_HEIGHT
  }
}
