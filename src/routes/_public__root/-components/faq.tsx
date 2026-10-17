import { FaqSection } from '~/components/faq-section'
import { m } from '~/paraglide/messages.js'
import { getHomeFaqItems } from './faq-items'

export const Faq = () => {
  return (
    <FaqSection items={getHomeFaqItems()} heading={m.common_faq_heading()} />
  )
}
