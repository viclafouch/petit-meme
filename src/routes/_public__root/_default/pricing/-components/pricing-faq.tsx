import { FaqSection } from '~/components/faq-section'
import { m } from '~/paraglide/messages.js'
import { getPricingFaqItems } from './constants'

export const PricingFaq = () => {
  return (
    <FaqSection
      items={getPricingFaqItems()}
      heading={m.common_faq_heading()}
      className="w-full max-w-2xl mx-auto"
      headingClassName="font-bricolage text-2xl font-semibold text-center mb-8 sm:text-3xl"
    />
  )
}
