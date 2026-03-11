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

/**
 * ffmpeg filter_complex string used to overlay the watermark on a video.
 * Shared by the batch CLI script (ffmpeg native) and the admin UI (ffmpeg WASM).
 *
 * Expects two inputs: [0:v] = source video, [1:v] = watermark PNG.
 *
 * Pipeline (3 filter chains separated by ";"):
 * 1. Split video [0:v] into [vid] (for overlay) and [ref] (as scale reference)
 * 2. Scale watermark to WATERMARK_WIDTH_RATIO of the video's shortest side (min of width/height), auto height, apply rgba + opacity
 * 3. Overlay watermark in bottom-right corner with equal margin based on shortest side
 *
 * Uses scale with rw/rh reference variables (ffmpeg 8+, replaces deprecated scale2ref).
 * The \\, escapes the comma inside min() so ffmpeg doesn't treat it as a filter separator.
 */
export const WATERMARK_FFMPEG_FILTER = [
  `[0:v]split[vid][ref]`,
  `[1:v][ref]scale='min(rw\\,rh)*${WATERMARK_WIDTH_RATIO}':-1,format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[wm]`,
  `[vid][wm]overlay=main_w-overlay_w-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN}):main_h-overlay_h-min(min(main_w\\,main_h)*${WATERMARK_MARGIN_RATIO}\\,${WATERMARK_MAX_MARGIN})`
].join(';')
