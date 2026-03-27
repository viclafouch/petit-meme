import { m } from '~/paraglide/messages.js'

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
  value: StudioFontSizeValue
}

export type StudioFontSizeValue = 24 | 36 | 48

export const getStudioFontSizes = (): StudioFontSize[] => {
  return [
    { id: 'small', label: m.studio_size_small(), value: 24 },
    { id: 'medium', label: m.studio_size_medium(), value: 36 },
    { id: 'large', label: m.studio_size_large(), value: 48 }
  ]
}

export type StudioColorEntry = {
  id: string
  label: string
  value: string
  className: string
}

export type StudioFontColorValue = 'black' | 'white' | 'red' | 'blue'

export const getStudioColors = (): StudioColorEntry[] => {
  return [
    {
      id: 'black',
      label: m.studio_color_black(),
      value: 'black',
      className: 'bg-black'
    },
    {
      id: 'white',
      label: m.studio_color_white(),
      value: 'white',
      className: 'bg-white'
    },
    {
      id: 'red',
      label: m.studio_color_red(),
      value: 'red',
      className: 'bg-red-600'
    },
    {
      id: 'blue',
      label: m.studio_color_blue(),
      value: 'blue',
      className: 'bg-blue-600'
    }
  ]
}

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
  },
  {
    id: 'impact',
    label: 'Impact',
    ffmpegFile: 'impact.ttf',
    fontPath: '/fonts/impact.ttf',
    cssFamily: 'Impact, sans-serif'
  }
] as const satisfies readonly StudioFont[]

export type StudioFontFamilyId = (typeof STUDIO_FONTS)[number]['id']

export type StudioBandColorValue = 'white' | 'black' | 'red' | 'blue'

const BAND_COLOR_ORDER: StudioBandColorValue[] = [
  'white',
  'black',
  'red',
  'blue'
]

export const getStudioBandColors = (): StudioColorEntry[] => {
  const allColors = getStudioColors()

  return BAND_COLOR_ORDER.map((id) => {
    return allColors.find((color) => {
      return color.id === id
    })!
  })
}

type StudioTemplateStyle = {
  id: StudioTemplateId
  fontFamily: StudioFontFamilyId
  fontSize: StudioFontSizeValue
  fontColor: StudioFontColorValue
  textPosition: StudioTextPosition
  bandColor: StudioBandColorValue
  bandOpacity: number
}

export type StudioTemplate = StudioTemplateStyle & {
  label: string
  description: string
}

export type StudioTemplateId = 'caption' | 'subtitle'

export const STUDIO_TEMPLATE_STYLES = [
  {
    id: 'caption',
    fontFamily: 'arial',
    fontSize: 36,
    fontColor: 'black',
    textPosition: 'top',
    bandColor: 'white',
    bandOpacity: 1
  },
  {
    id: 'subtitle',
    fontFamily: 'impact',
    fontSize: 36,
    fontColor: 'white',
    textPosition: 'bottom',
    bandColor: 'black',
    bandOpacity: 0.6
  }
] as const satisfies readonly StudioTemplateStyle[]

export const getStudioTemplates = (): StudioTemplate[] => {
  const labels: Record<
    StudioTemplateId,
    { label: string; description: string }
  > = {
    caption: {
      label: m.studio_template_caption(),
      description: m.studio_template_caption_desc()
    },
    subtitle: {
      label: m.studio_template_subtitle(),
      description: m.studio_template_subtitle_desc()
    }
  }

  return STUDIO_TEMPLATE_STYLES.map((style) => {
    return { ...style, ...labels[style.id] }
  })
}

export type StudioSettings = {
  text: string
  textPosition: StudioTextPosition
  fontSize: StudioFontSizeValue
  fontColor: StudioFontColorValue
  fontFamily: StudioFontFamilyId
  bandColor: StudioBandColorValue
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
