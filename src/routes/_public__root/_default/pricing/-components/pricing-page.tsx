import React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import {
  type BillingPeriod,
  getFreePlan,
  getPremiumPlan
} from '~/constants/plan'
import { useStripeCheckout } from '~/hooks/use-stripe-checkout'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { BillingToggle } from './billing-toggle'
import { GuaranteeBanner } from './guarantee-banner'
import { PricingCard } from './pricing-card'
import { PricingFaq } from './pricing-faq'
import { StatsSection } from './stats-section'

export const PricingPage = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const { goToBillingPortal, checkoutPremium } = useStripeCheckout()

  const [billingPeriod, setBillingPeriod] =
    React.useState<BillingPeriod>('monthly')

  const activeSubscriptionQuery = useSuspenseQuery(
    getActiveSubscriptionQueryOpts()
  )

  const isLoggedIn = user !== null
  const hasActiveSubscription =
    isLoggedIn && activeSubscriptionQuery.data !== null
  const isOnFreePlan = isLoggedIn && !hasActiveSubscription

  return (
    <div className="flex flex-col items-center gap-8 pb-16">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>{m.pricing_heading()}</PageHeading>
        <PageDescription>{m.pricing_description()}</PageDescription>
      </div>
      <BillingToggle
        billingPeriod={billingPeriod}
        onBillingPeriodChange={setBillingPeriod}
      />
      <section
        aria-label={m.pricing_plans_comparison()}
        className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2"
      >
        <PricingCard
          {...getFreePlan()}
          billingPeriod={billingPeriod}
          onChangePlan={() => {
            void goToBillingPortal()
          }}
          isActive={isOnFreePlan}
          className="order-last sm:order-0"
        />
        <PricingCard
          {...getPremiumPlan()}
          billingPeriod={billingPeriod}
          onChangePlan={() => {
            void checkoutPremium(billingPeriod)
          }}
          isActive={hasActiveSubscription}
        />
      </section>
      <div className="flex w-full flex-col items-center gap-16 pt-8">
        <GuaranteeBanner />
        <StatsSection />
        <PricingFaq />
      </div>
    </div>
  )
}
