export const BAN_REASONS = [
  'Spam',
  'Contenu inapproprié',
  'Harcèlement',
  "Usurpation d'identité",
  'Autre'
] as const satisfies readonly string[]

export type BanReason = (typeof BAN_REASONS)[number]
