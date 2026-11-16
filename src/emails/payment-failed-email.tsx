import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
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
    preview: 'Mets à jour ton moyen de paiement pour garder Premium.',
    heading: 'Ton paiement n’est pas passé',
    body: (username: string) => {
      return `Salut ${username}, le paiement de ton abonnement **Petit Meme** a échoué. Premium reste actif pendant que nous réessayons.`
    },
    warning:
      'Sans mise à jour de ton moyen de paiement, ton abonnement Premium prendra fin.',
    cta: 'Mettre à jour mon paiement',
    contact: (email: string) => {
      return `Une erreur ? Écris-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Update your payment method to keep Premium.',
    heading: 'Your payment didn’t go through',
    body: (username: string) => {
      return `Hi ${username}, the payment for your **Petit Meme** subscription failed. Premium stays active while we try again.`
    },
    warning:
      'Without an updated payment method, your Premium subscription will end.',
    cta: 'Update my payment',
    contact: (email: string) => {
      return `A mistake? Write to us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type PaymentFailedEmailProps = {
  username: string
  billingPortalUrl: string
  locale: Locale
}

export const PaymentFailedEmail = ({
  username,
  billingPortalUrl,
  locale
}: PaymentFailedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username)} />
      </EmailParagraph>
      <EmailCallout tone="danger">{tr.warning}</EmailCallout>
      <EmailButton href={billingPortalUrl}>{tr.cta}</EmailButton>
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  username: 'Alan',
  billingPortalUrl: 'https://billing.stripe.com/p/login/test_example',
  locale: 'fr'
} satisfies PaymentFailedEmailProps

type PaymentFailedEmailENProps = Omit<PaymentFailedEmailProps, 'locale'>

export const PaymentFailedEmailEN = (props: PaymentFailedEmailENProps) => {
  return <PaymentFailedEmail {...props} locale="en" />
}

PaymentFailedEmailEN.PreviewProps = {
  username: 'Alan',
  billingPortalUrl: 'https://billing.stripe.com/p/login/test_example'
} satisfies PaymentFailedEmailENProps

export default PaymentFailedEmail
