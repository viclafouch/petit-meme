export const WATERMARK_ASSET_PATH = '/images/watermark.png'

export const WATERMARK_OPACITY = 0.6

export const WATERMARK_WIDTH_RATIO = 0.21

export const WATERMARK_MARGIN_RATIO = 0.03

export const WATERMARK_MAX_MARGIN_IN_PIXELS = 20

const OVERLAY_EXPR = `main_w-overlay_w-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN_IN_PIXELS}):main_h-overlay_h-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN_IN_PIXELS})`

export const WATERMARK_FFMPEG_FILTER = [
  `[0:v]split[vid][ref]`,
  `[1:v][ref]scale='min(rw\\,rh)*${WATERMARK_WIDTH_RATIO}':-1,format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[wm]`,
  `[vid][wm]overlay=${OVERLAY_EXPR}`
].join(';')
