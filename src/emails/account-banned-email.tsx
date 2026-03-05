import type { Locale } from '@/paraglide/runtime'
import { Section, Text } from '@react-email/components'
import { BoldText, CONTACT_EMAIL, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton compte Petit Meme a été suspendu',
    title: 'Compte suspendu',
    subtitle: 'Ton compte a été suspendu par un administrateur.',
    body: (username: string, banReason: string) => {
      return `Salut ${username}, ton compte **Petit Meme** a été suspendu pour la raison suivante : **${banReason}**.`
    },
    noLogin:
      'Tu ne pourras plus te connecter à ton compte tant que la suspension sera active.',
    subscription:
      'Ton abonnement Premium sera annulé à la fin de ta période de facturation en cours. Tu ne seras plus débité par la suite.',
    contact: (email: string) => {
      return `Si tu penses qu’il s’agit d’une erreur, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your Petit Meme account has been suspended',
    title: 'Account suspended',
    subtitle: 'Your account has been suspended by an administrator.',
    body: (username: string, banReason: string) => {
      return `Hi ${username}, your **Petit Meme** account has been suspended for the following reason: **${banReason}**.`
    },
    noLogin:
      'You will not be able to sign in to your account while the suspension is active.',
    subscription:
      'Your Premium subscription will be cancelled at the end of your current billing period. You will not be charged again.',
    contact: (email: string) => {
      return `If you think this is an error, contact us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type AccountBannedEmailProps = {
  username: string
  banReason: string
  hasActiveSubscription: boolean
  locale: Locale
}

export const AccountBannedEmail = ({
  username,
  banReason,
  hasActiveSubscription,
  locale
}: AccountBannedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand-danger">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.body(username, banReason)} />
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.noLogin}
        </Text>
        {hasActiveSubscription ? (
          <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
            {tr.subscription}
          </Text>
        ) : null}
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.contact(CONTACT_EMAIL)} />
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountBannedEmail.PreviewProps = {
  username: 'Alan',
  banReason: 'Spam',
  hasActiveSubscription: true,
  locale: 'fr'
} satisfies AccountBannedEmailProps

export const AccountBannedEmailEN = (
  props: Omit<AccountBannedEmailProps, 'locale'>
) => {
  return <AccountBannedEmail {...props} locale="en" />
}

AccountBannedEmailEN.PreviewProps = {
  username: 'Alan',
  banReason: 'Spam',
  hasActiveSubscription: true
} satisfies Omit<AccountBannedEmailProps, 'locale'>

export default AccountBannedEmail
