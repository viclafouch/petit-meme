import { createFileRoute } from '@tanstack/react-router'
import { getFreePlan, getPremiumPlan } from '~/constants/plan'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { buildOgImageUrl, buildPricingJsonLd, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { getPricingFaqItems } from './-components/constants'
import { PricingPage } from './-components/pricing-page'

export const Route = createFileRoute('/_public__root/_default/pricing/')({
  component: PricingPage,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getActiveSubscriptionQueryOpts(),
      staleTime: 'static'
    })
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
    const locale = getLocale()

    return seo({
      title: m.seo_pricing_title(),
      pathname: '/pricing',
      description: m.seo_pricing_description(),
      keywords: m.seo_pricing_keywords(),
      image: buildOgImageUrl({
        type: 'pricing',
        subtitle: m.seo_pricing_description(),
        locale
      }),
      imageAlt: m.seo_pricing_title()
    })
  }
})
