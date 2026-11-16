import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
import { BoldText, EmailCallout, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Toutes tes sessions ont été déconnectées par sécurité.',
    heading: 'Ton mot de passe a changé',
    body: (username: string, changedAt: string) => {
      return `Salut ${username}, le mot de passe de ton compte **Petit Meme** a été modifié le ${changedAt}. Toutes tes sessions ont été déconnectées par sécurité.`
    },
    warning: (email: string) => {
      return `Ce n’est pas toi ? Écris-nous tout de suite à **${email}**.`
    }
  },
  en: {
    preview: 'All your sessions were signed out for security.',
    heading: 'Your password has changed',
    body: (username: string, changedAt: string) => {
      return `Hi ${username}, the password of your **Petit Meme** account was changed on ${changedAt}. All your sessions were signed out for security.`
    },
    warning: (email: string) => {
      return `Wasn’t you? Write to us right away at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type PasswordChangedEmailProps = {
  username: string
  changedAt: string
  locale: Locale
}

export const PasswordChangedEmail = ({
  username,
  changedAt,
  locale
}: PasswordChangedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username, changedAt)} />
      </EmailParagraph>
      <EmailCallout tone="danger">
        <BoldText text={tr.warning(CONTACT_EMAIL)} />
      </EmailCallout>
    </EmailLayout>
  )
}

PasswordChangedEmail.PreviewProps = {
  username: 'Alan',
  changedAt: '21 février 2026 à 14:30',
  locale: 'fr'
} satisfies PasswordChangedEmailProps

type PasswordChangedEmailENProps = Omit<PasswordChangedEmailProps, 'locale'>

export const PasswordChangedEmailEN = (props: PasswordChangedEmailENProps) => {
  return <PasswordChangedEmail {...props} locale="en" />
}

PasswordChangedEmailEN.PreviewProps = {
  username: 'Alan',
  changedAt: 'February 21, 2026 at 2:30 PM'
} satisfies PasswordChangedEmailENProps

export default PasswordChangedEmail
