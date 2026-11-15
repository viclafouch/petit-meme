import { Button, Section, Text } from 'react-email'
import type { Locale } from '~/paraglide/runtime'
import { BUTTON_CLASS, CONTACT_EMAIL, buildEmailUrl } from './constants'
import { BoldText, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton abonnement Premium Petit Meme a pris fin',
    title: 'Premium a pris fin',
    subtitle: 'Ton paiement n’est jamais passé.',
    body: (username: string) => {
      return `Salut ${username}, nous n’avons pas pu encaisser le paiement de ton abonnement **Petit Meme**, ton abonnement Premium a donc pris fin.`
    },
    notice:
      'Ton compte reste actif et toute la bibliothèque reste accessible gratuitement.',
    cta: 'Repasser Premium',
    contact: (email: string) => {
      return `Si tu penses qu’il s’agit d’une erreur, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your Petit Meme Premium subscription has ended',
    title: 'Premium has ended',
    subtitle: 'Your payment never went through.',
    body: (username: string) => {
      return `Hi ${username}, we could not collect the payment for your **Petit Meme** subscription, so your Premium subscription has ended.`
    },
    notice: 'Your account stays active and the whole library is still free.',
    cta: 'Get Premium again',
    contact: (email: string) => {
      return `If you think this is an error, contact us at **${email}**.`
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
        <Section className="mb-6 rounded-lg border border-solid border-brand-border p-4">
          <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
            {tr.notice}
          </Text>
        </Section>
        <Section className="mb-6 mt-2">
          <Button
            className={BUTTON_CLASS}
            href={buildEmailUrl('/pricing', locale)}
          >
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
