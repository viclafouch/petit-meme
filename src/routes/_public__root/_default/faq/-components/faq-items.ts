import type { FaqItem } from '~/constants/faq'
import { m } from '~/paraglide/messages'

type FaqPageItem = FaqItem & {
  leadsToDmca?: boolean
}

export const getFaqItems = (): FaqPageItem[] => {
  return [
    { question: m.faq_q_what(), answer: m.faq_a_what() },
    { question: m.faq_q_free(), answer: m.faq_a_free() },
    { question: m.faq_q_account(), answer: m.faq_a_account() },
    { question: m.faq_q_share(), answer: m.faq_a_share() },
    { question: m.faq_q_download(), answer: m.faq_a_download() },
    { question: m.faq_q_studio(), answer: m.faq_a_studio() },
    { question: m.faq_q_app(), answer: m.faq_a_app() },
    { question: m.faq_q_premium(), answer: m.faq_a_premium() },
    { question: m.faq_q_propose(), answer: m.faq_a_propose() },
    { question: m.faq_q_source(), answer: m.faq_a_source() },
    {
      question: m.faq_q_takedown(),
      answer: m.faq_a_takedown(),
      leadsToDmca: true
    }
  ]
}
