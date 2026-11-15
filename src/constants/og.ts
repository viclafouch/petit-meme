export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export const OG_MEME_THUMBNAIL_SOURCE = 'meme-thumbnail'

export type ImageSize = {
  width: number
  height: number
}

export const THUMBNAIL_SIZES = {
  '1x1': { width: 1200, height: 1200 },
  '4x3': { width: 1200, height: 900 },
  '16x9': { width: 1200, height: 675 }
} as const satisfies Record<string, ImageSize>

export type ThumbnailRatio = keyof typeof THUMBNAIL_SIZES

export const THUMBNAIL_RATIOS = [
  '1x1',
  '4x3',
  '16x9'
] as const satisfies readonly ThumbnailRatio[]
