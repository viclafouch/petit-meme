import type { BillingPeriod } from '~/constants/plan'
import { matchIsUserAdmin, type UserRoleHolder } from '~/helpers/role'
import {
  getBillingPeriodFromInterval,
  getSubscriptionEnding,
  getSubscriptionState,
  matchHasBeenPaid,
  matchIsPremiumSubscriptionStatus,
  type SubscriptionEnding,
  type SubscriptionState
} from '~/helpers/subscription'

export const PREMIUM_PLAN_LABELS = {
  monthly: 'Premium mensuel',
  yearly: 'Premium annuel'
} as const satisfies Record<BillingPeriod, string>

type SubscriptionRow = {
  status: string
  billingInterval: string | null
  periodEnd: Date | null
  cancelAt: Date | null
  cancelAtPeriodEnd: boolean | null
  endedAt: Date | null
}

export type SubscriptionInfo = {
  state: SubscriptionState | null
  isPremium: boolean
  billingPeriod: BillingPeriod | null
  ending: SubscriptionEnding | null
}

const NO_SUBSCRIPTION: SubscriptionInfo = {
  state: null,
  isPremium: false,
  billingPeriod: null,
  ending: null
}

const STATE_PRIORITY = {
  active: 0,
  ending: 0,
  failing: 1,
  ended: 2
} as const satisfies Record<SubscriptionState, number>

const getEndingTime = ({ date }: SubscriptionEnding) => {
  return date ? new Date(date).getTime() : 0
}

export function buildSubscriptionInfo(
  subscriptions: SubscriptionRow[]
): SubscriptionInfo {
  const [currentSubscription] = subscriptions
    .filter(matchHasBeenPaid)
    .map((subscription) => {
      return {
        state: getSubscriptionState(subscription),
        isPremium: matchIsPremiumSubscriptionStatus(subscription.status),
        billingPeriod: getBillingPeriodFromInterval(
          subscription.billingInterval
        ),
        ending: getSubscriptionEnding(subscription)
      }
    })
    .toSorted((first, second) => {
      const priorityGap =
        STATE_PRIORITY[first.state] - STATE_PRIORITY[second.state]

      return priorityGap === 0
        ? getEndingTime(second.ending) - getEndingTime(first.ending)
        : priorityGap
    })

  return currentSubscription ?? NO_SUBSCRIPTION
}

export const PREMIUM_SOURCES = [
  'admin',
  'paid',
  'granted',
  'none'
] as const satisfies readonly string[]

export type PremiumSource = (typeof PREMIUM_SOURCES)[number]

type PremiumStatus =
  | { source: 'admin' }
  | { source: 'paid' }
  | { source: 'granted'; grantedAt: Date }
  | { source: 'none' }

type GetPremiumStatusParams = UserRoleHolder & {
  premiumGrantedAt: Date | null
  subscription: Pick<SubscriptionInfo, 'isPremium'>
}

export function getPremiumStatus({
  role,
  premiumGrantedAt,
  subscription
}: GetPremiumStatusParams): PremiumStatus {
  if (matchIsUserAdmin({ role })) {
    return { source: 'admin' }
  }

  if (subscription.isPremium) {
    return { source: 'paid' }
  }

  if (premiumGrantedAt) {
    return { source: 'granted', grantedAt: premiumGrantedAt }
  }

  return { source: 'none' }
}
