import type { FaqItem } from '~/constants/faq'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'

type FaqPageItem = FaqItem & {
  leadsToDmca?: boolean
}

export const getFaqItems = (locale: Locale): FaqPageItem[] => {
  const options = { locale }

  return [
    { question: m.faq_q_what({}, options), answer: m.faq_a_what({}, options) },
    { question: m.faq_q_free({}, options), answer: m.faq_a_free({}, options) },
    {
      question: m.faq_q_account({}, options),
      answer: m.faq_a_account({}, options)
    },
    {
      question: m.faq_q_share({}, options),
      answer: m.faq_a_share({}, options)
    },
    {
      question: m.faq_q_download({}, options),
      answer: m.faq_a_download({}, options)
    },
    {
      question: m.faq_q_studio({}, options),
      answer: m.faq_a_studio({}, options)
    },
    { question: m.faq_q_app({}, options), answer: m.faq_a_app({}, options) },
    {
      question: m.faq_q_premium({}, options),
      answer: m.faq_a_premium({}, options)
    },
    {
      question: m.faq_q_propose({}, options),
      answer: m.faq_a_propose({}, options)
    },
    {
      question: m.faq_q_source({}, options),
      answer: m.faq_a_source({}, options)
    },
    {
      question: m.faq_q_takedown({}, options),
      answer: m.faq_a_takedown({}, options),
      leadsToDmca: true
    }
  ]
}
