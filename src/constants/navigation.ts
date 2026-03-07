import { m } from '@/paraglide/messages.js'
import type { LinkOptions } from '@tanstack/react-router'

export type LegalLink = {
  to: LinkOptions['to']
  label: string
}

export const getLegalLinks = (): LegalLink[] => {
  return [
    { to: '/privacy', label: m.footer_privacy() },
    { to: '/terms-of-use', label: m.footer_terms() },
    { to: '/mentions-legales', label: m.footer_legal() }
  ]
}
