import { LOGO_PATH } from '~/constants/branding'
import type { Locale } from '~/paraglide/runtime'
import { pixelBasedPreset } from '@react-email/components'

export const SITE_URL = 'https://www.petit-meme.io'

export const buildEmailUrl = (path: string, locale: Locale) => {
  return `${SITE_URL}${locale === 'fr' ? '' : `/${locale}`}${path}`
}

export const LOGO_URL = `${SITE_URL}${LOGO_PATH}`
export const CONTACT_EMAIL = 'hello@petit-meme.io'

export const BUTTON_CLASS =
  'box-border inline-block rounded-xl bg-brand-button px-8 py-4 text-center text-sm font-semibold text-brand-button-foreground no-underline'

export const TAILWIND_CONFIG = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: '#0a0a0a',
        'brand-foreground': '#fafafa',
        'brand-muted': '#a3a3a3',
        'brand-muted-dark': '#737373',
        'brand-border': '#e5e5e5',
        'brand-button': '#0a0a0a',
        'brand-button-foreground': '#fafafa',
        'brand-danger': '#b91c1c',
        'brand-danger-bg': '#fef2f2',
        'brand-danger-border': '#fecaca',
        'brand-success': '#15803d',
        'brand-success-bg': '#f0fdf4',
        'brand-success-border': '#bbf7d0'
      }
    }
  }
} as const satisfies typeof pixelBasedPreset
