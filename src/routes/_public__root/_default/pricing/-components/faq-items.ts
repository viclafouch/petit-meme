import type { FaqItem } from '~/constants/faq'
import { m } from '~/paraglide/messages'

export const getPricingFaqItems = (): FaqItem[] => {
  return [
    { question: m.pricing_faq_q1(), answer: m.pricing_faq_a1() },
    { question: m.pricing_faq_q2(), answer: m.pricing_faq_a2() },
    { question: m.pricing_faq_q3(), answer: m.pricing_faq_a3() },
    { question: m.pricing_faq_q4(), answer: m.pricing_faq_a4() }
  ]
}
