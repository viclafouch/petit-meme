import React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  type BillingPeriod,
  getFreePlan,
  getPremiumPlan
} from '~/constants/plan'
import { useStripeCheckout } from '~/hooks/use-stripe-checkout'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { buildPricingJsonLd, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { BillingToggle } from './-components/billing-toggle'
import { getPricingFaqItems } from './-components/constants'
import { GuaranteeBanner } from './-components/guarantee-banner'
import { PricingCard } from './-components/pricing-card'
import { PricingFaq } from './-components/pricing-faq'
import { StatsSection } from './-components/stats-section'

const RouteComponent = () => {
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
    <div className="container flex flex-col items-center gap-8 pb-16">
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

export const Route = createFileRoute('/_public__root/_default/pricing/')({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getActiveSubscriptionQueryOpts())
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          buildPricingJsonLd({
            plans: [getFreePlan(), getPremiumPlan()],
            faqItems: getPricingFaqItems()
          })
        )
      }
    ]
  },
  head: () => {
    return seo({
      title: m.seo_pricing_title(),
      pathname: '/pricing',
      description: m.seo_pricing_description(),
      keywords: m.seo_pricing_keywords()
    })
  }
})
