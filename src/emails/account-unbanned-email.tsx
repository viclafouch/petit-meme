import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl, CONTACT_EMAIL } from './constants'
import {
  BoldText,
  EmailButton,
  EmailNote,
  EmailParagraph
} from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Tu peux de nouveau te connecter.',
    heading: 'Ton compte est réactivé',
    body: (username: string) => {
      return `Salut ${username}, la suspension de ton compte **Petit Meme** est levée. Tu peux de nouveau te connecter et utiliser le site.`
    },
    cta: 'Se connecter',
    contact: (email: string) => {
      return `Une question ? Écris-nous à **${email}**.`
    }
  },
  en: {
    preview: 'You can sign in again.',
    heading: 'Your account is active again',
    body: (username: string) => {
      return `Hi ${username}, the suspension on your **Petit Meme** account has been lifted. You can sign in and use the site again.`
    },
    cta: 'Sign in',
    contact: (email: string) => {
      return `A question? Write to us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type AccountUnbannedEmailProps = {
  username: string
  locale: Locale
}

export const AccountUnbannedEmail = ({
  username,
  locale
}: AccountUnbannedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username)} />
      </EmailParagraph>
      <EmailButton href={buildEmailUrl('/', locale)}>{tr.cta}</EmailButton>
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
    </EmailLayout>
  )
}

AccountUnbannedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies AccountUnbannedEmailProps

type AccountUnbannedEmailENProps = Omit<AccountUnbannedEmailProps, 'locale'>

export const AccountUnbannedEmailEN = (props: AccountUnbannedEmailENProps) => {
  return <AccountUnbannedEmail {...props} locale="en" />
}

AccountUnbannedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies AccountUnbannedEmailENProps

export default AccountUnbannedEmail
