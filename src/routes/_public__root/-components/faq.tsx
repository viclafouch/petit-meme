import type { FaqItem } from '@/components/faq-section'
import { FaqSection } from '@/components/faq-section'
import { m } from '@/paraglide/messages.js'

export const getHomeFaqItems = (): FaqItem[] => {
  return [
    { question: m.home_faq_q1(), answer: m.home_faq_a1() },
    { question: m.home_faq_q2(), answer: m.home_faq_a2() },
    { question: m.home_faq_q3(), answer: m.home_faq_a3() },
    { question: m.home_faq_q4(), answer: m.home_faq_a4() },
    { question: m.home_faq_q5(), answer: m.home_faq_a5() },
    { question: m.home_faq_q6(), answer: m.home_faq_a6() }
  ]
}

export const Faq = () => {
  return (
    <FaqSection items={getHomeFaqItems()} heading={m.common_faq_heading()} />
  )
}
