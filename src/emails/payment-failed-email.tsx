import type { Locale } from '~/paraglide/runtime'
import { Button, Section, Text } from '@react-email/components'
import {
  BoldText,
  BUTTON_CLASS,
  CONTACT_EMAIL,
  EmailLayout
} from './email-layout'

const translations = {
  fr: {
    preview: 'Échec de paiement pour ton abonnement Petit Meme',
    title: 'Échec de paiement',
    subtitle: 'Ton dernier paiement n’a pas pu être traité.',
    body: (username: string) => {
      return `Salut ${username}, nous n’avons pas pu traiter le paiement de ton abonnement **Petit Meme**.`
    },
    warning:
      'Sans mise à jour de ton moyen de paiement, tu perdras l’accès aux fonctionnalités premium.',
    cta: 'Mettre à jour mon paiement',
    contact: (email: string) => {
      return `Si tu penses qu’il s’agit d’une erreur, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Payment failed for your Petit Meme subscription',
    title: 'Payment failed',
    subtitle: 'Your last payment could not be processed.',
    body: (username: string) => {
      return `Hi ${username}, we could not process the payment for your **Petit Meme** subscription.`
    },
    warning:
      'Without updating your payment method, you will lose access to premium features.',
    cta: 'Update my payment',
    contact: (email: string) => {
      return `If you think this is an error, contact us at **${email}**.`
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
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.body(username)} />
        </Text>
        <Section className="mb-6 rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-xs leading-5 text-brand-danger">
            {tr.warning}
          </Text>
        </Section>
        <Section className="mb-6 mt-2">
          <Button className={BUTTON_CLASS} href={billingPortalUrl}>
            {tr.cta}
          </Button>
        </Section>
        <Text className="m-0 text-xs leading-5 text-brand-muted">
          <BoldText text={tr.contact(CONTACT_EMAIL)} />
        </Text>
      </Section>
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  username: 'Alan',
  billingPortalUrl: 'https://billing.stripe.com/p/login/test_example',
  locale: 'fr'
} satisfies PaymentFailedEmailProps

export const PaymentFailedEmailEN = (
  props: Omit<PaymentFailedEmailProps, 'locale'>
) => {
  return <PaymentFailedEmail {...props} locale="en" />
}

PaymentFailedEmailEN.PreviewProps = {
  username: 'Alan',
  billingPortalUrl: 'https://billing.stripe.com/p/login/test_example'
} satisfies Omit<PaymentFailedEmailProps, 'locale'>

export default PaymentFailedEmail
