import { Button, Section, Text } from '@react-email/components'
import type { Locale } from '~/paraglide/runtime'
import { BUTTON_CLASS, EmailLayout, SITE_URL } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton abonnement Premium est activé !',
    title: 'Abonnement activé',
    subtitle: (username: string) => {
      return `Bienvenue dans le mode premium, ${username} !`
    },
    planLabel: 'Abonnement',
    amountLabel: 'Montant',
    periodAnnual: '/an',
    periodMonthly: '/mois',
    body: 'Tu as désormais accès à toutes les fonctionnalités premium. Profite bien de Petit Meme !',
    cta: 'Explorer Petit Meme'
  },
  en: {
    preview: 'Your Premium subscription is active!',
    title: 'Subscription active',
    subtitle: (username: string) => {
      return `Welcome to premium, ${username}!`
    },
    planLabel: 'Subscription',
    amountLabel: 'Amount',
    periodAnnual: '/yr',
    periodMonthly: '/mo',
    body: 'You now have access to all premium features. Enjoy Petit Meme!',
    cta: 'Explore Petit Meme'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type SubscriptionConfirmedEmailProps = {
  username: string
  planTitle: string
  amount: string
  isAnnual: boolean
  locale: Locale
}

export const SubscriptionConfirmedEmail = ({
  username,
  planTitle,
  amount,
  isAnnual,
  locale
}: SubscriptionConfirmedEmailProps) => {
  const tr = translations[locale]
  const periodSuffix = isAnnual ? tr.periodAnnual : tr.periodMonthly

  return (
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle(username)}
        </Text>
        <Section className="mb-6 rounded-lg border border-solid border-brand-success-border bg-brand-success-bg p-4">
          <Text className="m-0 text-sm leading-6 text-brand-success">
            {tr.planLabel} : <b>{planTitle}</b>
          </Text>
          <Text className="m-0 mt-1 text-sm leading-6 text-brand-success">
            {tr.amountLabel} :{' '}
            <b>
              {amount}
              {periodSuffix}
            </b>
          </Text>
        </Section>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.body}
        </Text>
        <Section className="mt-2">
          <Button className={BUTTON_CLASS} href={SITE_URL}>
            {tr.cta}
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  )
}

SubscriptionConfirmedEmail.PreviewProps = {
  username: 'Alan',
  planTitle: 'Premium',
  amount: '3,99 €',
  isAnnual: false,
  locale: 'fr'
} satisfies SubscriptionConfirmedEmailProps

export const SubscriptionConfirmedEmailEN = (
  props: Omit<SubscriptionConfirmedEmailProps, 'locale'>
) => {
  return <SubscriptionConfirmedEmail {...props} locale="en" />
}

SubscriptionConfirmedEmailEN.PreviewProps = {
  username: 'Alan',
  planTitle: 'Premium',
  amount: '€3.99',
  isAnnual: false
} satisfies Omit<SubscriptionConfirmedEmailProps, 'locale'>

export default SubscriptionConfirmedEmail
