// Path to the watermark PNG asset (logo + "petit-meme.io" on semi-transparent dark background)
export const WATERMARK_ASSET_PATH = '/images/watermark.png'

// Overall watermark opacity applied on top of the video (0 = invisible, 1 = fully opaque)
export const WATERMARK_OPACITY = 0.6

// Watermark width as a fraction of the video width (0.21 = 21% — visible on portrait 9:16 videos)
export const WATERMARK_WIDTH_RATIO = 0.21

// Margin between the watermark and the video edges, as a fraction of the video's shortest side (0.03 = 3%)
export const WATERMARK_MARGIN_RATIO = 0.03

// Maximum margin in pixels (caps on large videos to stay close to edges)
export const WATERMARK_MAX_MARGIN = 20

const OVERLAY_EXPR = `main_w-overlay_w-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN}):main_h-overlay_h-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN})`

// CLI batch script (ffmpeg 8+): uses scale with rw/rh reference variables
export const WATERMARK_FFMPEG_FILTER = [
  `[0:v]split[vid][ref]`,
  `[1:v][ref]scale='min(rw\\,rh)*${WATERMARK_WIDTH_RATIO}':-1,format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[wm]`,
  `[vid][wm]overlay=${OVERLAY_EXPR}`
].join(';')
