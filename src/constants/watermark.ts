// Path to the watermark PNG asset (logo + "petit-meme.io" on semi-transparent dark background)
export const WATERMARK_ASSET_PATH = '/images/watermark.png'

// Overall watermark opacity applied on top of the video (0 = invisible, 1 = fully opaque)
export const WATERMARK_OPACITY = 0.6

// Watermark width as a fraction of the video width (0.15 = 15% of video width)
export const WATERMARK_WIDTH_RATIO = 0.15

// Margin between the watermark and the video edges, as a fraction of the video size (0.02 = 2%)
export const WATERMARK_MARGIN_RATIO = 0.02

/**
 * ffmpeg filter_complex string used to overlay the watermark on a video.
 * Shared by the batch CLI script (ffmpeg native) and the admin UI (ffmpeg WASM).
 *
 * Expects two inputs: [0:v] = source video, [1:v] = watermark PNG.
 *
 * Pipeline:
 * 1. Scale the watermark to WATERMARK_WIDTH_RATIO of the video width (height auto)
 * 2. Convert to rgba to preserve transparency
 * 3. Reduce opacity via colorchannelmixer (multiplies alpha channel)
 * 4. Overlay in the bottom-right corner with WATERMARK_MARGIN_RATIO margin
 */
export const WATERMARK_FFMPEG_FILTER = [
  `[1:v]scale=main_w*${WATERMARK_WIDTH_RATIO}:-1`,
  `format=rgba`,
  `colorchannelmixer=aa=${WATERMARK_OPACITY}[wm]`,
  `[0:v][wm]overlay=main_w-overlay_w-main_w*${WATERMARK_MARGIN_RATIO}:main_h-overlay_h-main_h*${WATERMARK_MARGIN_RATIO}`
].join(',')
