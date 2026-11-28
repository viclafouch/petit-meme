import type { Offer, Product } from 'schema-dts'
import { createIsomorphicFn } from '@tanstack/react-start'
import { SITE_NAME } from '~/constants/branding'
import { getFreePlan, getPremiumPlan, type Plan } from '~/constants/plan'
import { convertCentsToEuros } from '~/helpers/number'
import {
  buildBreadcrumbNode,
  SITE_LOGO_URL,
  serializeJsonLdGraph
} from '~/lib/seo/json-ld'
import { buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

type BuildPlanOfferParams = {
  plan: Plan
  priceInCents: number
  nameSuffix: string
  unitCode: string
  offerUrl: string
}

const buildPlanOffer = ({
  plan,
  priceInCents,
  nameSuffix,
  unitCode,
  offerUrl
}: BuildPlanOfferParams): Offer => {
  const priceEuros = convertCentsToEuros(priceInCents).toFixed(2)

  return {
    '@type': 'Offer',
    name: `${plan.title}${nameSuffix}`,
    description: plan.description,
    price: priceEuros,
    priceCurrency: 'EUR',
    url: offerUrl,
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: priceEuros,
      priceCurrency: 'EUR',
      referenceQuantity: {
        '@type': 'QuantitativeValue',
        value: 1,
        unitCode
      }
    }
  }
}

const buildPlanOffers = (plan: Plan, offerUrl: string): Offer[] => {
  const monthlyOffer = buildPlanOffer({
    plan,
    priceInCents: plan.pricing.monthly.priceInCents,
    nameSuffix: '',
    unitCode: 'MON',
    offerUrl
  })

  if (plan.pricing.yearly.priceInCents <= 0) {
    return [monthlyOffer]
  }

  return [
    monthlyOffer,
    buildPlanOffer({
      plan,
      priceInCents: plan.pricing.yearly.priceInCents,
      nameSuffix: m.seo_pricing_annual_suffix(),
      unitCode: 'ANN',
      offerUrl
    })
  ]
}

const buildSubscriptionProductNode = (plans: readonly Plan[]): Product => {
  const pricingUrl = buildUrl('/pricing', getLocale())
  const monthlyPrices = plans.map((plan) => {
    return convertCentsToEuros(plan.pricing.monthly.priceInCents)
  })

  return {
    '@type': 'Product',
    '@id': `${pricingUrl}#product`,
    name: m.seo_pricing_subscription_name(),
    image: SITE_LOGO_URL,
    description: m.seo_pricing_description(),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      offerCount: plans.length,
      lowPrice: Math.min(...monthlyPrices).toFixed(2),
      highPrice: Math.max(...monthlyPrices).toFixed(2),
      offers: plans.flatMap((plan) => {
        return buildPlanOffers(plan, pricingUrl)
      })
    }
  }
}

export const getPricingJsonLd = createIsomorphicFn()
  .server(() => {
    return serializeJsonLdGraph([
      buildSubscriptionProductNode([getFreePlan(), getPremiumPlan()]),
      buildBreadcrumbNode([
        { name: m.seo_pricing_title(), pathname: '/pricing' }
      ])
    ])
  })
  .client(() => {
    return null
  })
