import {
  WATERMARK_MARGIN_RATIO,
  WATERMARK_MAX_MARGIN_IN_PIXELS
} from '~/constants/watermark'

export const getWatermarkMargin = (minSide: number) => {
  return Math.min(
    Math.round(minSide * WATERMARK_MARGIN_RATIO),
    WATERMARK_MAX_MARGIN_IN_PIXELS
  )
}
