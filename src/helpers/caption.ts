import CAPTION_FONT_ADVANCES from '~/constants/caption-font-advances.json'
import {
  CAPTION_LINE_HEIGHT,
  CAPTION_LOOKS,
  CAPTION_MAX_LINE_BREAKS,
  CAPTION_MIN_STROKE,
  CAPTION_SLOTS,
  CAPTION_STROKE_RATIO,
  type Caption,
  type CaptionLook,
  type CaptionLookId,
  type CaptionSlot
} from '~/constants/studio'

const NO_BREAK_SPACE = '\u00A0'
const BAND_PADDING_BLOCK_RATIO = 0.75
const BAND_PADDING_INLINE_RATIO = 0.05
const OVERLAY_EDGE_RATIO = 0.035
const SUBTITLE_PADDING_BLOCK_RATIO = 0.35
const FONT_STEP_RATIO = 0.002
const FONT_REFERENCE_HEIGHT_FACTOR = 1.6
const MIN_OVERLAY_FONT_SIZE = 12
const MISSING_GLYPH_EM = 1
const EM_UNITS = 1000

export type MeasureText = (text: string, font: string) => number

export type CaptionBlockLayout = {
  slot: CaptionSlot
  lines: string[]
  fontSize: number
  lineHeight: number
  blockHeight: number
  textTop: number
}

export type CaptionLayout = {
  isBand: boolean
  width: number
  videoHeight: number
  topBandHeight: number
  bottomBandHeight: number
  outputHeight: number
  blocks: CaptionBlockLayout[]
}

export const getCaptionLook = (lookId: CaptionLookId): CaptionLook => {
  return (
    CAPTION_LOOKS.find((look) => {
      return look.id === lookId
    }) ?? CAPTION_LOOKS[0]
  )
}

export const getOtherCaptionSlot = (slot: CaptionSlot): CaptionSlot => {
  return slot === 'top' ? 'bottom' : 'top'
}

export const matchHasSlotText = (caption: Caption, slot: CaptionSlot) => {
  return caption[slot].trim() !== ''
}

export const listFilledCaptionSlots = (caption: Caption) => {
  return CAPTION_SLOTS.filter((slot) => {
    return matchHasSlotText(caption, slot)
  })
}

export const matchHasCaptionText = (caption: Caption) => {
  return listFilledCaptionSlots(caption).length > 0
}

export const buildCaptionKey = (caption: Caption) => {
  return JSON.stringify([
    caption.look,
    caption.top.trim(),
    caption.bottom.trim()
  ])
}

export const buildCaptionFont = (fontSize: number, fontFamily: string) => {
  return `${fontSize}px "${fontFamily}"`
}

export const getCaptionStrokeWidth = (fontSize: number) => {
  return Math.max(CAPTION_MIN_STROKE, fontSize * CAPTION_STROKE_RATIO)
}

export const roundToEven = (value: number) => {
  return Math.max(2, Math.round(value / 2) * 2)
}

const roundUpToEven = (value: number) => {
  const rounded = Math.ceil(value)

  return rounded % 2 === 0 ? rounded : rounded + 1
}

const limitLineBreaks = (text: string) => {
  let breaks = 0

  return text
    .replace(/^\n+/u, '')
    .replaceAll(/\n{2,}/gu, '\n')
    .replaceAll('\n', () => {
      breaks += 1

      return breaks > CAPTION_MAX_LINE_BREAKS ? ' ' : '\n'
    })
}

export const bindFrenchPunctuation = (text: string) => {
  return limitLineBreaks(text)
    .replaceAll(/«[ \t]+/gu, `«${NO_BREAK_SPACE}`)
    .replaceAll(/[ \t]+([»?!:;])/gu, `${NO_BREAK_SPACE}$1`)
    .replaceAll(
      /(\d)[ \t]+(h|min|s|€|%|km|kg|ans?)(?=$|[\s.,!?;:)])/gu,
      `$1${NO_BREAK_SPACE}$2`
    )
}

export const moveCaptionToLook = (
  caption: Caption,
  lookId: CaptionLookId
): Caption => {
  const { defaultSlot } = getCaptionLook(lookId)
  const otherSlot = getOtherCaptionSlot(defaultSlot)
  const isOnlyInOtherSlot =
    !matchHasSlotText(caption, defaultSlot) &&
    matchHasSlotText(caption, otherSlot)

  if (!isOnlyInOtherSlot) {
    return { ...caption, look: lookId }
  }

  return {
    ...caption,
    look: lookId,
    [defaultSlot]: caption[otherSlot],
    [otherSlot]: ''
  }
}

const ADVANCE_TABLES = new Map(
  Object.entries(CAPTION_FONT_ADVANCES).map(([family, { chars, widths }]) => {
    return [
      family,
      new Map(
        Array.from(chars, (character, index) => {
          return [character, (widths[index] ?? 0) / EM_UNITS]
        })
      )
    ]
  })
)

export const estimateCaptionText: MeasureText = (text, font) => {
  const fontSize = Number.parseFloat(font)
  const family = /"([^"]+)"/u.exec(font)?.[1] ?? ''
  const advances = ADVANCE_TABLES.get(family)
  let width = 0

  for (const character of text) {
    width += advances?.get(character) ?? MISSING_GLYPH_EM
  }

  return width * fontSize
}

const breakWord = (
  word: string,
  maxWidth: number,
  measure: (text: string) => number
) => {
  const pieces: string[] = []
  let current = ''

  for (const character of word) {
    if (current !== '' && measure(current + character) > maxWidth) {
      pieces.push(current)
      current = character
    } else {
      current += character
    }
  }

  return current === '' ? pieces : [...pieces, current]
}

const wrapParagraph = (
  paragraph: string,
  maxWidth: number,
  measure: (text: string) => number
) => {
  const lines: string[] = []
  let current = ''

  for (const word of paragraph.split(/[ \t]+/u).filter(Boolean)) {
    const candidate = current === '' ? word : `${current} ${word}`

    if (measure(candidate) <= maxWidth) {
      current = candidate
      continue
    }

    if (current !== '') {
      lines.push(current)
    }

    if (measure(word) <= maxWidth) {
      current = word
      continue
    }

    const pieces = breakWord(word, maxWidth, measure)
    lines.push(...pieces.slice(0, -1))
    current = pieces.at(-1) ?? ''
  }

  return current === '' ? lines : [...lines, current]
}

export const wrapCaptionText = (
  text: string,
  maxWidth: number,
  measure: (text: string) => number
) => {
  return text
    .split('\n')
    .map((paragraph) => {
      return paragraph.trim()
    })
    .filter(Boolean)
    .flatMap((paragraph) => {
      return wrapParagraph(paragraph, maxWidth, measure)
    })
}

type LayoutBlockParams = {
  text: string
  slot: CaptionSlot
  width: number
  fontReference: number
  maxBlockHeight: number | null
  look: CaptionLook
  measureText: MeasureText
}

const layoutBlock = ({
  text,
  slot,
  width,
  fontReference,
  maxBlockHeight,
  look,
  measureText
}: LayoutBlockParams): CaptionBlockLayout => {
  const paddingFor = (size: number) => {
    if (look.isBand) {
      return size * BAND_PADDING_BLOCK_RATIO
    }

    return look.backgroundColor === null
      ? 0
      : size * SUBTITLE_PADDING_BLOCK_RATIO
  }
  const displayText = look.isUppercase ? text.toLocaleUpperCase('fr') : text
  const maxTextWidth = width * (1 - BAND_PADDING_INLINE_RATIO * 2)
  const maxFontSize = Math.round(fontReference * look.maxFontRatio)
  const minFontSize = Math.round(fontReference * look.minFontRatio)
  const fontStep = Math.max(1, Math.round(fontReference * FONT_STEP_RATIO))

  const wrapAt = (fontSize: number) => {
    const font = buildCaptionFont(fontSize, look.fontFamily)

    return wrapCaptionText(displayText, maxTextWidth, (candidate) => {
      return measureText(candidate, font)
    })
  }

  const measureHeight = (size: number, lineCount: number) => {
    return (
      Math.round(size * CAPTION_LINE_HEIGHT) * lineCount + paddingFor(size) * 2
    )
  }

  const paragraphCount = displayText.split('\n').filter((paragraph) => {
    return paragraph.trim() !== ''
  }).length
  const allowedLines = Math.max(look.maxLinesAtMaxSize, paragraphCount)
  let fontSize = maxFontSize
  let lines = wrapAt(fontSize)

  while (lines.length > allowedLines && fontSize > minFontSize) {
    fontSize = Math.max(minFontSize, fontSize - fontStep)
    lines = wrapAt(fontSize)
  }

  if (maxBlockHeight !== null) {
    while (
      measureHeight(fontSize, lines.length) > maxBlockHeight &&
      fontSize > MIN_OVERLAY_FONT_SIZE
    ) {
      fontSize = Math.max(MIN_OVERLAY_FONT_SIZE, fontSize - fontStep)
      lines = wrapAt(fontSize)
    }
  }

  const lineHeight = Math.round(fontSize * CAPTION_LINE_HEIGHT)
  const textHeight = lines.length * lineHeight
  const paddingBlock = paddingFor(fontSize)
  const blockHeight = look.isBand
    ? roundUpToEven(textHeight + paddingBlock * 2)
    : Math.round(textHeight + paddingBlock * 2)

  return {
    slot,
    lines,
    fontSize,
    lineHeight,
    blockHeight,
    textTop: Math.round((blockHeight - textHeight) / 2)
  }
}

const getOverlayEdge = (width: number) => {
  return Math.round(width * OVERLAY_EDGE_RATIO)
}

type LayoutCaptionParams = {
  caption: Caption
  width: number
  videoHeight: number
  measureText: MeasureText
  sharedSlotCount?: number
}

export const layoutCaption = ({
  caption,
  width,
  videoHeight,
  measureText,
  sharedSlotCount
}: LayoutCaptionParams): CaptionLayout => {
  const look = getCaptionLook(caption.look)
  const filledSlots = listFilledCaptionSlots(caption)
  const fontReference = Math.min(
    width,
    videoHeight * FONT_REFERENCE_HEIGHT_FACTOR
  )
  const slotCount = Math.max(1, sharedSlotCount ?? filledSlots.length)
  const overlaySpace = videoHeight - getOverlayEdge(width) * (slotCount + 1)
  const maxBlockHeight = look.isBand
    ? null
    : Math.floor(overlaySpace / slotCount)
  const blocks = filledSlots.map((slot) => {
    return layoutBlock({
      text: caption[slot].trim(),
      slot,
      width,
      fontReference,
      maxBlockHeight,
      look,
      measureText
    })
  })

  const bandHeightOf = (slot: CaptionSlot) => {
    if (!look.isBand) {
      return 0
    }

    return (
      blocks.find((block) => {
        return block.slot === slot
      })?.blockHeight ?? 0
    )
  }

  const topBandHeight = bandHeightOf('top')
  const bottomBandHeight = bandHeightOf('bottom')

  return {
    isBand: look.isBand,
    width,
    videoHeight,
    topBandHeight,
    bottomBandHeight,
    outputHeight: topBandHeight + videoHeight + bottomBandHeight,
    blocks
  }
}

export const getBlockTop = (
  layout: CaptionLayout,
  block: CaptionBlockLayout
) => {
  if (layout.isBand) {
    return block.slot === 'top' ? 0 : layout.topBandHeight + layout.videoHeight
  }

  const edge = getOverlayEdge(layout.width)
  const videoTop =
    block.slot === 'top' ? edge : layout.videoHeight - block.blockHeight - edge

  return layout.topBandHeight + videoTop
}
