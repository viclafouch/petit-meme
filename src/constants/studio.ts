import { z } from 'zod'
import { m } from '~/paraglide/messages'

export const studioMemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  bunnyId: z.string(),
  width: z.number(),
  height: z.number()
})

export type StudioMeme = z.infer<typeof studioMemeSchema>

export type CaptionLookId = 'white-band' | 'black-band' | 'impact' | 'subtitle'

export type CaptionSlot = 'top' | 'bottom'

export type Caption = {
  look: CaptionLookId
  top: string
  bottom: string
}

export type CaptionLook = {
  id: CaptionLookId
  isBand: boolean
  fontFamily: string
  isUppercase: boolean
  textColor: string
  backgroundColor: string | null
  strokeColor: string | null
  maxFontRatio: number
  minFontRatio: number
  maxLinesAtMaxSize: number
  defaultSlot: CaptionSlot
}

export const CAPTION_SLOTS = [
  'top',
  'bottom'
] as const satisfies readonly CaptionSlot[]

const CAPTION_FONT_FAMILIES = {
  arial: 'Studio Arial',
  impact: 'Studio Impact'
} as const

export const CAPTION_FONT_FILES = [
  { family: CAPTION_FONT_FAMILIES.arial, url: '/fonts/studio-arial.woff2' },
  { family: CAPTION_FONT_FAMILIES.impact, url: '/fonts/studio-impact.woff2' }
] as const

export const CAPTION_LOOKS = [
  {
    id: 'white-band',
    isBand: true,
    fontFamily: CAPTION_FONT_FAMILIES.arial,
    isUppercase: false,
    textColor: '#000000',
    backgroundColor: '#ffffff',
    strokeColor: null,
    maxFontRatio: 0.072,
    minFontRatio: 0.042,
    maxLinesAtMaxSize: 2,
    defaultSlot: 'top'
  },
  {
    id: 'black-band',
    isBand: true,
    fontFamily: CAPTION_FONT_FAMILIES.arial,
    isUppercase: false,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    strokeColor: null,
    maxFontRatio: 0.072,
    minFontRatio: 0.042,
    maxLinesAtMaxSize: 2,
    defaultSlot: 'top'
  },
  {
    id: 'impact',
    isBand: false,
    fontFamily: CAPTION_FONT_FAMILIES.impact,
    isUppercase: true,
    textColor: '#ffffff',
    backgroundColor: null,
    strokeColor: '#000000',
    maxFontRatio: 0.11,
    minFontRatio: 0.06,
    maxLinesAtMaxSize: 2,
    defaultSlot: 'top'
  },
  {
    id: 'subtitle',
    isBand: false,
    fontFamily: CAPTION_FONT_FAMILIES.arial,
    isUppercase: false,
    textColor: '#ffffff',
    backgroundColor: 'rgb(0 0 0 / 0.62)',
    strokeColor: null,
    maxFontRatio: 0.058,
    minFontRatio: 0.038,
    maxLinesAtMaxSize: 2,
    defaultSlot: 'bottom'
  }
] as const satisfies readonly CaptionLook[]

export const INITIAL_CAPTION: Caption = {
  look: 'white-band',
  top: '',
  bottom: ''
}

export const CAPTION_TEXT_MAX_LENGTH = 120

export const CAPTION_MAX_LINE_BREAKS = 3

export const CAPTION_LINE_HEIGHT = 1.18

export const CAPTION_STROKE_RATIO = 0.14

export const CAPTION_MIN_STROKE = 2

export const STUDIO_RENDER_DEBOUNCE_MS = 600

export const STUDIO_CELEBRATION_MS = 5200

export type StudioPlan = 'free' | 'premium'

export const CAPTION_SLOT_LABELS = {
  top: () => {
    return m.studio_add_top()
  },
  bottom: () => {
    return m.studio_add_bottom()
  }
} as const satisfies Record<CaptionSlot, () => string>
