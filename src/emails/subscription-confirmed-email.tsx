import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl } from './constants'
import { EmailButton, EmailDetails, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton abonnement Premium est actif.',
    heading: (username: string) => {
      return `Bienvenue dans Premium, ${username} !`
    },
    body: 'Ton abonnement est actif : vidéos sans watermark, son des mèmes, et plus aucune limite sur les favoris, le Studio et la recherche IA.',
    planLabel: 'Abonnement',
    amountLabel: 'Montant',
    perYear: (amount: string) => {
      return `${amount} par an`
    },
    perMonth: (amount: string) => {
      return `${amount} par mois`
    },
    cta: 'Explorer Petit Meme'
  },
  en: {
    preview: 'Your Premium subscription is active.',
    heading: (username: string) => {
      return `Welcome to Premium, ${username}!`
    },
    body: 'Your subscription is active: videos without watermark, meme sounds, and no more limits on bookmarks, the Studio and AI search.',
    planLabel: 'Subscription',
    amountLabel: 'Amount',
    perYear: (amount: string) => {
      return `${amount} per year`
    },
    perMonth: (amount: string) => {
      return `${amount} per month`
    },
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

  return (
    <EmailLayout
      preview={tr.preview}
      heading={tr.heading(username)}
      locale={locale}
    >
      <EmailParagraph>{tr.body}</EmailParagraph>
      <EmailDetails
        details={[
          { label: tr.planLabel, value: planTitle },
          {
            label: tr.amountLabel,
            value: isAnnual ? tr.perYear(amount) : tr.perMonth(amount)
          }
        ]}
      />
      <EmailButton href={buildEmailUrl('/', locale)}>{tr.cta}</EmailButton>
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

type SubscriptionConfirmedEmailENProps = Omit<
  SubscriptionConfirmedEmailProps,
  'locale'
>

export const SubscriptionConfirmedEmailEN = (
  props: SubscriptionConfirmedEmailENProps
) => {
  return <SubscriptionConfirmedEmail {...props} locale="en" />
}

SubscriptionConfirmedEmailEN.PreviewProps = {
  username: 'Alan',
  planTitle: 'Premium',
  amount: '€3.99',
  isAnnual: false
} satisfies SubscriptionConfirmedEmailENProps

export default SubscriptionConfirmedEmail
