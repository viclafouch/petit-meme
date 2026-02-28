import { FaqSection } from '@/components/faq-section'
import { PRICING_FAQ_ITEMS } from './constants'

export const PricingFaq = () => {
  return (
    <FaqSection
      items={PRICING_FAQ_ITEMS}
      className="w-full max-w-2xl mx-auto"
      headingClassName="font-bricolage text-2xl font-semibold text-center mb-8 sm:text-3xl"
    />
  )
}
