import { describe, expect, it } from 'vitest'
import { INITIAL_CAPTION, type Caption } from '~/constants/studio'
import {
  bindFrenchPunctuation,
  buildCaptionKey,
  estimateCaptionText,
  getBlockTop,
  layoutCaption,
  moveCaptionToLook,
  wrapCaptionText
} from '~/helpers/caption'

const NO_BREAK_SPACE = '\u00A0'
const VIDEO_WIDTH = 1280
const VIDEO_HEIGHT = 720
const MONOSPACE_ADVANCE = 10
const SEVEN_CHARACTERS_WIDTH = 70
const FOUR_CHARACTERS_WIDTH = 40

const measureMonospace = (text: string) => {
  return text.length * MONOSPACE_ADVANCE
}

const buildCaption = (overrides: Partial<Caption>): Caption => {
  return { ...INITIAL_CAPTION, ...overrides }
}

const layout = (caption: Caption) => {
  return layoutCaption({
    caption,
    width: VIDEO_WIDTH,
    videoHeight: VIDEO_HEIGHT,
    measureText: estimateCaptionText
  })
}

describe('bindFrenchPunctuation', () => {
  it('should glue French punctuation and units to the word before', () => {
    expect(bindFrenchPunctuation('« Quoi ? » à 3 h, 10 % !')).toBe(
      `«${NO_BREAK_SPACE}Quoi${NO_BREAK_SPACE}?${NO_BREAK_SPACE}» à 3${NO_BREAK_SPACE}h, 10${NO_BREAK_SPACE}%${NO_BREAK_SPACE}!`
    )
  })

  it('should keep three line breaks at most, without blank lines', () => {
    expect(bindFrenchPunctuation('\nun\n\n\ndeux\ntrois\nquatre\ncinq')).toBe(
      'un\ndeux\ntrois\nquatre cinq'
    )
  })
})

describe('buildCaptionKey', () => {
  it('should ignore the spaces around each text', () => {
    expect(buildCaptionKey(buildCaption({ top: ' Salut ' }))).toBe(
      buildCaptionKey(buildCaption({ top: 'Salut' }))
    )
  })
})

describe('moveCaptionToLook', () => {
  it('should move a lone text to the slot of the new look', () => {
    expect(
      moveCaptionToLook(buildCaption({ top: 'Salut' }), 'subtitle')
    ).toStrictEqual({ look: 'subtitle', top: '', bottom: 'Salut' })
  })

  it('should keep both texts in place', () => {
    expect(
      moveCaptionToLook(buildCaption({ top: 'Haut', bottom: 'Bas' }), 'impact')
    ).toStrictEqual({ look: 'impact', top: 'Haut', bottom: 'Bas' })
  })
})

describe('wrapCaptionText', () => {
  it('should wrap on words and keep explicit line breaks', () => {
    expect(
      wrapCaptionText(
        'un deux trois\nquatre',
        SEVEN_CHARACTERS_WIDTH,
        measureMonospace
      )
    ).toStrictEqual(['un deux', 'trois', 'quatre'])
  })

  it('should split a word wider than the line', () => {
    expect(
      wrapCaptionText('abcdefghij', FOUR_CHARACTERS_WIDTH, measureMonospace)
    ).toStrictEqual(['abcd', 'efgh', 'ij'])
  })
})

describe('layoutCaption', () => {
  it('should add even bands around the video for band looks', () => {
    const result = layout(buildCaption({ top: 'Haut', bottom: 'Bas' }))

    expect(result.topBandHeight % 2).toBe(0)
    expect(result.bottomBandHeight % 2).toBe(0)
    expect(result.outputHeight).toBe(
      result.topBandHeight + VIDEO_HEIGHT + result.bottomBandHeight
    )
  })

  it('should keep the video size for overlay looks', () => {
    const result = layout(
      buildCaption({ look: 'impact', top: 'Haut', bottom: 'Bas' })
    )

    expect(result.outputHeight).toBe(VIDEO_HEIGHT)
    expect(result.blocks).toHaveLength(2)
  })

  it('should keep a long overlay text inside the video', () => {
    const longText = Array.from({ length: 4 }, () => {
      return 'Quand ta mère te demande pourquoi tu es encore réveillé'
    }).join('\n')
    const result = layout(buildCaption({ look: 'impact', top: longText }))
    const blockBottoms = result.blocks.map((block) => {
      return getBlockTop(result, block) + block.blockHeight
    })

    expect(blockBottoms).toHaveLength(1)
    expect(Math.max(...blockBottoms)).toBeLessThanOrEqual(VIDEO_HEIGHT)
  })

  it('should lay out nothing without text', () => {
    expect(layout(INITIAL_CAPTION).blocks).toStrictEqual([])
  })
})
