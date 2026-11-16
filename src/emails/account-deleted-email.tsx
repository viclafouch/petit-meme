import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
import { BoldText, EmailNote, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Toutes tes données personnelles ont été effacées.',
    heading: 'Ton compte a été supprimé',
    body: (username: string) => {
      return `Salut ${username}, ton compte **Petit Meme** a été supprimé et toutes tes données personnelles ont été effacées.`
    },
    thanks: 'Merci d’avoir utilisé Petit Meme.',
    contact: (email: string) => {
      return `Une erreur ? Écris-nous vite à **${email}** pour qu’on t’aide.`
    }
  },
  en: {
    preview: 'All your personal data has been erased.',
    heading: 'Your account has been deleted',
    body: (username: string) => {
      return `Hi ${username}, your **Petit Meme** account has been deleted and all your personal data has been erased.`
    },
    thanks: 'Thanks for using Petit Meme.',
    contact: (email: string) => {
      return `A mistake? Write to us quickly at **${email}** so we can help.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type AccountDeletedEmailProps = {
  username: string
  locale: Locale
}

export const AccountDeletedEmail = ({
  username,
  locale
}: AccountDeletedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username)} />
      </EmailParagraph>
      <EmailParagraph>{tr.thanks}</EmailParagraph>
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
    </EmailLayout>
  )
}

AccountDeletedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies AccountDeletedEmailProps

type AccountDeletedEmailENProps = Omit<AccountDeletedEmailProps, 'locale'>

export const AccountDeletedEmailEN = (props: AccountDeletedEmailENProps) => {
  return <AccountDeletedEmail {...props} locale="en" />
}

AccountDeletedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies AccountDeletedEmailENProps

export default AccountDeletedEmail
