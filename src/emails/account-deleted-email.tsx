import type { Locale } from '~/paraglide/runtime'
import { Section, Text } from '@react-email/components'
import { BoldText, CONTACT_EMAIL, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton compte Petit Meme a été supprimé',
    title: 'Compte supprimé',
    subtitle: 'Ton compte a bien été supprimé.',
    body: (username: string) => {
      return `Salut ${username}, ton compte **Petit Meme** a été supprimé avec succès. Toutes tes données personnelles ont été effacées.`
    },
    contact: (email: string) => {
      return `Si tu penses que cette suppression est une erreur, contacte-nous rapidement à **${email}** pour que nous puissions t’aider.`
    },
    thanks: 'Merci d’avoir utilisé Petit Meme.'
  },
  en: {
    preview: 'Your Petit Meme account has been deleted',
    title: 'Account deleted',
    subtitle: 'Your account has been successfully deleted.',
    body: (username: string) => {
      return `Hi ${username}, your **Petit Meme** account has been deleted successfully. All your personal data has been erased.`
    },
    contact: (email: string) => {
      return `If you think this deletion was a mistake, contact us quickly at **${email}** so we can help.`
    },
    thanks: 'Thanks for using Petit Meme.'
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
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.contact(CONTACT_EMAIL)} />
        </Text>
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          {tr.thanks}
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountDeletedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies AccountDeletedEmailProps

export const AccountDeletedEmailEN = (
  props: Omit<AccountDeletedEmailProps, 'locale'>
) => {
  return <AccountDeletedEmail {...props} locale="en" />
}

AccountDeletedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies Omit<AccountDeletedEmailProps, 'locale'>

export default AccountDeletedEmail
