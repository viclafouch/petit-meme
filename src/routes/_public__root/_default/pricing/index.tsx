import { createFileRoute } from '@tanstack/react-router'
import { getFreePlan, getPremiumPlan } from '~/constants/plan'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildPricingJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { getPricingFaqItems } from './-components/faq-items'
import { PricingPage } from './-components/pricing-page'

export const Route = createFileRoute('/_public__root/_default/pricing/')({
  component: PricingPage,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getPremiumSubscriptionQueryOpts(),
      staleTime: 'static'
    })
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: serializeJsonLd(
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

    return buildSeo({
      title: m.seo_pricing_title(),
      pathname: '/pricing',
      description: m.seo_pricing_description(),
      keywords: m.seo_pricing_keywords(),
      image: buildOgImage(
        {
          type: 'pricing',
          subtitle: m.seo_pricing_description(),
          locale
        },
        m.seo_pricing_title()
      )
    })
  }
})
