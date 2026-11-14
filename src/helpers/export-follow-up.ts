import { DAY } from '~/constants/time'

const PREMIUM_INVITATION_QUIET_DAYS = 3

export const PREMIUM_INVITATION_QUIET_PERIOD_MS =
  PREMIUM_INVITATION_QUIET_DAYS * DAY

export type ExportFollowUp = 'install' | 'premium' | null

type ResolveExportFollowUpParams = {
  isPremium: boolean
  isInstallable: boolean
  canShowInstallOfferHere: boolean
  wasInstallOffered: boolean
  premiumSnoozedAt: number | null
  now: number
}

export const resolveExportFollowUp = ({
  isPremium,
  isInstallable,
  canShowInstallOfferHere,
  wasInstallOffered,
  premiumSnoozedAt,
  now
}: ResolveExportFollowUpParams): ExportFollowUp => {
  if (isInstallable && !wasInstallOffered) {
    return canShowInstallOfferHere ? 'install' : null
  }

  if (isPremium) {
    return null
  }

  const isPremiumQuiet =
    premiumSnoozedAt !== null &&
    now - premiumSnoozedAt < PREMIUM_INVITATION_QUIET_PERIOD_MS

  return isPremiumQuiet ? null : 'premium'
}
