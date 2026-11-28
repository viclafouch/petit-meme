import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { renderJsonLdScripts } from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { PricingPage } from './-components/pricing-page'
import { getPricingJsonLd } from './-lib/pricing-json-ld'

export const Route = createFileRoute('/_public__root/_default/pricing/')({
  component: PricingPage,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getPremiumSubscriptionQueryOpts(),
      staleTime: 'static'
    })

    return { jsonLd: getPricingJsonLd() }
  },
  scripts: renderJsonLdScripts,
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
