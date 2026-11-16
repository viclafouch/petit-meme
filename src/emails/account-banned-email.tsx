import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
import { BoldText, EmailNote, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Tu ne peux plus te connecter tant que la suspension dure.',
    heading: 'Ton compte est suspendu',
    body: (username: string, banReason: string) => {
      return `Salut ${username}, ton compte **Petit Meme** a été suspendu pour la raison suivante : **${banReason}**.`
    },
    noLogin: 'Tu ne peux plus te connecter tant que la suspension dure.',
    subscription:
      'Ton abonnement Premium prendra fin avec la période déjà payée. Tu ne seras plus débité.',
    contact: (email: string) => {
      return `Une erreur ? Écris-nous à **${email}**.`
    }
  },
  en: {
    preview: 'You can’t sign in while the suspension lasts.',
    heading: 'Your account is suspended',
    body: (username: string, banReason: string) => {
      return `Hi ${username}, your **Petit Meme** account has been suspended for the following reason: **${banReason}**.`
    },
    noLogin: 'You can’t sign in while the suspension lasts.',
    subscription:
      'Your Premium subscription will end with the period already paid. You won’t be charged again.',
    contact: (email: string) => {
      return `A mistake? Write to us at **${email}**.`
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
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username, banReason)} />
      </EmailParagraph>
      <EmailParagraph>{tr.noLogin}</EmailParagraph>
      {hasActiveSubscription ? (
        <EmailParagraph>{tr.subscription}</EmailParagraph>
      ) : null}
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
    </EmailLayout>
  )
}

AccountBannedEmail.PreviewProps = {
  username: 'Alan',
  banReason: 'Spam',
  hasActiveSubscription: true,
  locale: 'fr'
} satisfies AccountBannedEmailProps

type AccountBannedEmailENProps = Omit<AccountBannedEmailProps, 'locale'>

export const AccountBannedEmailEN = (props: AccountBannedEmailENProps) => {
  return <AccountBannedEmail {...props} locale="en" />
}

AccountBannedEmailEN.PreviewProps = {
  username: 'Alan',
  banReason: 'Spam',
  hasActiveSubscription: true
} satisfies AccountBannedEmailENProps

export default AccountBannedEmail
