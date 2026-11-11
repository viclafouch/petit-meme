import { FaqSection } from '~/components/marketing/faq-section'
import { m } from '~/paraglide/messages'
import { getHomeFaqItems } from './faq-items'

export const Faq = () => {
  return (
    <FaqSection items={getHomeFaqItems()} heading={m.common_faq_heading()} />
  )
}
