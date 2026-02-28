import React from 'react'
import { type BillingPeriod, FREE_PLAN, PREMIUM_PLAN } from '@/constants/plan'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import { getActiveSubscriptionQueryOpts } from '@/lib/queries'
import { buildPricingJsonLd, seo } from '@/lib/seo'
import {
  PageDescription,
  PageHeading
} from '@/routes/_public__root/-components/page-headers'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { BillingToggle } from './-components/billing-toggle'
import { PRICING_FAQ_ITEMS } from './-components/constants'
import { GuaranteeBanner } from './-components/guarantee-banner'
import { PricingCard } from './-components/pricing-card'
import { PricingFaq } from './-components/pricing-faq'
import { StatsSection } from './-components/stats-section'

const RouteComponent = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const { goToBillingPortal, checkoutPremium } = useStripeCheckout()

  const [billingPeriod, setBillingPeriod] =
    React.useState<BillingPeriod>('yearly')

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
        <PageHeading>Plans</PageHeading>
        <PageDescription>
          Choisissez l'offre qui correspond à vos besoins, du gratuit à
          l'illimité.
        </PageDescription>
      </div>
      <BillingToggle
        billingPeriod={billingPeriod}
        onBillingPeriodChange={setBillingPeriod}
      />
      <section
        aria-label="Comparaison des plans"
        className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2"
      >
        <PricingCard
          {...FREE_PLAN}
          billingPeriod={billingPeriod}
          onChangePlan={() => {
            void goToBillingPortal()
          }}
          isActive={isOnFreePlan}
          className="order-last sm:order-0"
        />
        <PricingCard
          {...PREMIUM_PLAN}
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
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          buildPricingJsonLd({
            plans: [FREE_PLAN, PREMIUM_PLAN],
            faqItems: PRICING_FAQ_ITEMS
          })
        )
      }
    ]
  },
  head: () => {
    return seo({
      title: 'Plans et Tarifs',
      pathname: '/pricing',
      description:
        'Découvre les plans de Petit Meme : gratuit ou Premium avec accès illimité aux mèmes, favoris et générations de vidéos. Choisis le plan qui te permet de créer et partager des mèmes sans limites !',
      keywords:
        'tarifs memes, abonnement memes video, prix petit meme, plan gratuit memes, premium memes, générateur vidéo memes'
    })
  }
})
