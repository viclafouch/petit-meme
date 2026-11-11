import type { BillingPeriod } from '~/constants/plan'
import {
  getBillingPeriodFromInterval,
  getSubscriptionEnding,
  getSubscriptionState,
  matchHasBeenPaid,
  matchIsPremiumState,
  type SubscriptionEnding,
  type SubscriptionState
} from '~/helpers/subscription'
import { matchIsUserAdmin, type UserRoleHolder } from '~/lib/role'

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
  billingPeriod: BillingPeriod | null
  ending: SubscriptionEnding | null
}

const NO_SUBSCRIPTION: SubscriptionInfo = {
  state: null,
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
  subscription: Pick<SubscriptionInfo, 'state'>
}

export function getPremiumStatus({
  role,
  premiumGrantedAt,
  subscription
}: GetPremiumStatusParams): PremiumStatus {
  if (matchIsUserAdmin({ role })) {
    return { source: 'admin' }
  }

  if (subscription.state !== null && matchIsPremiumState(subscription.state)) {
    return { source: 'paid' }
  }

  if (premiumGrantedAt) {
    return { source: 'granted', grantedAt: premiumGrantedAt }
  }

  return { source: 'none' }
}
