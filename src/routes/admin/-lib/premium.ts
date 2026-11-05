import type { SubscriptionInfo } from '~/routes/admin/-server/users'

export const PREMIUM_SOURCES = [
  'paid',
  'granted',
  'none'
] as const satisfies readonly string[]

export type PremiumSource = (typeof PREMIUM_SOURCES)[number]

type PremiumStatus =
  | { source: 'paid' }
  | { source: 'granted'; grantedAt: Date }
  | { source: 'none' }

type GetPremiumStatusParams = {
  premiumGrantedAt: Date | null
  subscription: Pick<SubscriptionInfo, 'status'>
}

export function getPremiumStatus({
  premiumGrantedAt,
  subscription
}: GetPremiumStatusParams): PremiumStatus {
  if (subscription.status === 'active') {
    return { source: 'paid' }
  }

  if (premiumGrantedAt) {
    return { source: 'granted', grantedAt: premiumGrantedAt }
  }

  return { source: 'none' }
}
