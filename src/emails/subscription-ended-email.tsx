import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl, CONTACT_EMAIL } from './constants'
import {
  BoldText,
  EmailButton,
  EmailCallout,
  EmailNote,
  EmailParagraph
} from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton compte reste actif et la bibliothèque reste gratuite.',
    heading: 'Ton abonnement Premium a pris fin',
    body: (username: string) => {
      return `Salut ${username}, le paiement de ton abonnement **Petit Meme** n’a jamais pu être encaissé, ton abonnement Premium a donc pris fin.`
    },
    notice:
      'Ton compte reste actif et toute la bibliothèque reste accessible gratuitement.',
    cta: 'Repasser Premium',
    contact: (email: string) => {
      return `Une erreur ? Écris-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your account stays active and the library stays free.',
    heading: 'Your Premium subscription has ended',
    body: (username: string) => {
      return `Hi ${username}, the payment for your **Petit Meme** subscription never went through, so your Premium subscription has ended.`
    },
    notice: 'Your account stays active and the whole library is still free.',
    cta: 'Get Premium again',
    contact: (email: string) => {
      return `A mistake? Write to us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type SubscriptionEndedEmailProps = {
  username: string
  locale: Locale
}

export const SubscriptionEndedEmail = ({
  username,
  locale
}: SubscriptionEndedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username)} />
      </EmailParagraph>
      <EmailCallout tone="neutral">{tr.notice}</EmailCallout>
      <EmailButton href={buildEmailUrl('/pricing', locale)}>
        {tr.cta}
      </EmailButton>
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
    </EmailLayout>
  )
}

SubscriptionEndedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies SubscriptionEndedEmailProps

type SubscriptionEndedEmailENProps = Omit<SubscriptionEndedEmailProps, 'locale'>

export const SubscriptionEndedEmailEN = (
  props: SubscriptionEndedEmailENProps
) => {
  return <SubscriptionEndedEmail {...props} locale="en" />
}

SubscriptionEndedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies SubscriptionEndedEmailENProps

export default SubscriptionEndedEmail
