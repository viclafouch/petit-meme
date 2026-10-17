export const BAN_REASONS = [
  'Spam',
  'Contenu inapproprié',
  'Harcèlement',
  "Usurpation d'identité",
  'Autre'
] as const satisfies readonly string[]

export type BanReason = (typeof BAN_REASONS)[number]

export const matchIsBanReason = (value: string): value is BanReason => {
  return BAN_REASONS.some((reason) => {
    return reason === value
  })
}
