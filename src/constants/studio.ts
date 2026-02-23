export const STUDIO_DEFAULT_BAND_HEIGHT = 100
export const STUDIO_DEFAULT_FONT_SIZE = 36
export const STUDIO_DEFAULT_FONT_COLOR = 'black'
export const STUDIO_DEFAULT_MAX_CHARS_PER_LINE = 50
export const STUDIO_TEXT_MAX_LENGTH = 150
export const STUDIO_LINE_SPACING = 4
export const STUDIO_BASELINE_RATIO = 0.2

export type StudioTextPosition = 'top' | 'bottom'

type StudioFontSize = {
  id: string
  label: string
  value: number
}

export const STUDIO_FONT_SIZES = [
  { id: 'small', label: 'P', value: 24 },
  { id: 'medium', label: 'M', value: 36 },
  { id: 'large', label: 'G', value: 48 }
] as const satisfies readonly StudioFontSize[]

export type StudioFontSizeValue = (typeof STUDIO_FONT_SIZES)[number]['value']

type StudioColor = {
  id: string
  label: string
  value: string
  className: string
}

export const STUDIO_COLORS = [
  { id: 'black', label: 'Noir', value: 'black', className: 'bg-black' },
  { id: 'red', label: 'Rouge', value: 'red', className: 'bg-red-600' },
  { id: 'blue', label: 'Bleu', value: 'blue', className: 'bg-blue-600' }
] as const satisfies readonly StudioColor[]

export type StudioFontColorValue = (typeof STUDIO_COLORS)[number]['value']

type StudioFont = {
  id: string
  label: string
  ffmpegFile: string
  fontPath: string
  cssFamily: string
}

export const STUDIO_FONTS = [
  {
    id: 'arial',
    label: 'Arial',
    ffmpegFile: 'arial.ttf',
    fontPath: '/fonts/arial.ttf',
    cssFamily: 'Arial, sans-serif'
  }
] as const satisfies readonly StudioFont[]

export type StudioFontFamilyId = (typeof STUDIO_FONTS)[number]['id']

type StudioTemplate = {
  id: string
  label: string
  description: string
  fontFamily: StudioFontFamilyId
  fontSize: StudioFontSizeValue
  fontColor: StudioFontColorValue
  textPosition: StudioTextPosition
  bandColor: string
  bandOpacity: number
}

export const STUDIO_TEMPLATES = [
  {
    id: 'caption',
    label: 'Légende',
    description: 'Bande blanche, texte noir',
    fontFamily: 'arial',
    fontSize: 36,
    fontColor: 'black',
    textPosition: 'top',
    bandColor: 'white',
    bandOpacity: 1
  },
  {
    id: 'subtitle',
    label: 'Sous-titre',
    description: 'Fond semi-transparent, texte rouge',
    fontFamily: 'arial',
    fontSize: 36,
    fontColor: 'red',
    textPosition: 'bottom',
    bandColor: 'black',
    bandOpacity: 0.6
  }
] as const satisfies readonly StudioTemplate[]

export type StudioTemplateId = (typeof STUDIO_TEMPLATES)[number]['id']

export type StudioBandColor = (typeof STUDIO_TEMPLATES)[number]['bandColor']

export type StudioSettings = {
  text: string
  textPosition: StudioTextPosition
  fontSize: StudioFontSizeValue
  fontColor: StudioFontColorValue
  fontFamily: StudioFontFamilyId
  bandColor: StudioBandColor
  bandOpacity: number
}

export const STUDIO_DEFAULT_SETTINGS = {
  text: '',
  textPosition: 'top',
  fontSize: STUDIO_DEFAULT_FONT_SIZE,
  fontColor: STUDIO_DEFAULT_FONT_COLOR,
  fontFamily: 'arial',
  bandColor: 'white',
  bandOpacity: 1
} as const satisfies StudioSettings
