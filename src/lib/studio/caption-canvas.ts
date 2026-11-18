import { createClientOnlyFn } from '@tanstack/react-start'
import { CAPTION_FONT_FILES, type Caption } from '~/constants/studio'
import {
  buildCaptionFont,
  getBlockTop,
  getCaptionLook,
  getCaptionStrokeWidth,
  type CaptionLayout,
  type MeasureText
} from '~/helpers/caption'

const FONT_PROBE_SIZE = '32px'
const FONT_PROBE_TEXT = 'Mg'
const LINE_MIDDLE = 0.5

let fontsPromise: Promise<void> | null = null

const loadFontFiles = async () => {
  await Promise.all(
    CAPTION_FONT_FILES.map(({ family }) => {
      return document.fonts.load(
        `${FONT_PROBE_SIZE} "${family}"`,
        FONT_PROBE_TEXT
      )
    })
  )
}

export const loadCaptionFonts = createClientOnlyFn(() => {
  fontsPromise ??= loadFontFiles()

  return fontsPromise
})

let measureContext: CanvasRenderingContext2D | null = null

export const measureCaptionText: MeasureText = createClientOnlyFn(
  (text: string, font: string) => {
    measureContext ??= document.createElement('canvas').getContext('2d')

    if (measureContext === null) {
      return text.length
    }

    measureContext.font = font

    return measureContext.measureText(text).width
  }
)

type PaintCaptionOverlayParams = {
  caption: Caption
  layout: CaptionLayout
}

export const paintCaptionOverlay = createClientOnlyFn(
  ({ caption, layout }: PaintCaptionOverlayParams) => {
    const look = getCaptionLook(caption.look)
    const canvas = new OffscreenCanvas(layout.width, layout.outputHeight)
    const context = canvas.getContext('2d')

    if (context === null) {
      throw new Error('Canvas 2D is unavailable')
    }

    for (const block of layout.blocks) {
      const top = getBlockTop(layout, block)

      if (look.backgroundColor !== null) {
        context.fillStyle = look.backgroundColor
        context.fillRect(0, top, layout.width, block.blockHeight)
      }

      context.font = buildCaptionFont(block.fontSize, look.fontFamily)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.lineJoin = 'round'

      for (const [index, line] of block.lines.entries()) {
        const y = top + block.textTop + block.lineHeight * (index + LINE_MIDDLE)

        if (look.strokeColor !== null) {
          context.strokeStyle = look.strokeColor
          context.lineWidth = getCaptionStrokeWidth(block.fontSize)
          context.strokeText(line, layout.width / 2, y)
        }

        context.fillStyle = look.textColor
        context.fillText(line, layout.width / 2, y)
      }
    }

    return canvas.transferToImageBitmap()
  }
)
