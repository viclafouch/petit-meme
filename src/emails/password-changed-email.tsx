import { Section, Text } from '@react-email/components'
import type { Locale } from '~/paraglide/runtime'
import { BoldText, CONTACT_EMAIL, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton mot de passe Petit Meme a été modifié',
    title: 'Mot de passe modifié',
    subtitle: (changedAt: string) => {
      return `Modification effectuée le ${changedAt}.`
    },
    body: (username: string) => {
      return `Salut ${username}, ton mot de passe **Petit Meme** a été modifié avec succès. Toutes les sessions actives ont été déconnectées par mesure de sécurité.`
    },
    warning: (email: string) => {
      return `Si tu n’es pas à l’origine de ce changement, contacte-nous immédiatement à **${email}**.`
    }
  },
  en: {
    preview: 'Your Petit Meme password has been changed',
    title: 'Password changed',
    subtitle: (changedAt: string) => {
      return `Changed on ${changedAt}.`
    },
    body: (username: string) => {
      return `Hi ${username}, your **Petit Meme** password has been changed successfully. All active sessions have been signed out for security.`
    },
    warning: (email: string) => {
      return `If you did not make this change, contact us immediately at **${email}**.`
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
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle(changedAt)}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.body(username)} />
        </Text>
        <Section className="rounded-lg border border-solid border-brand-danger-border bg-brand-danger-bg p-4">
          <Text className="m-0 text-xs leading-5 text-brand-danger">
            <BoldText text={tr.warning(CONTACT_EMAIL)} />
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}

PasswordChangedEmail.PreviewProps = {
  username: 'Alan',
  changedAt: '21 février 2026 à 14:30',
  locale: 'fr'
} satisfies PasswordChangedEmailProps

export const PasswordChangedEmailEN = (
  props: Omit<PasswordChangedEmailProps, 'locale'>
) => {
  return <PasswordChangedEmail {...props} locale="en" />
}

PasswordChangedEmailEN.PreviewProps = {
  username: 'Alan',
  changedAt: 'February 21, 2026 at 2:30 PM'
} satisfies Omit<PasswordChangedEmailProps, 'locale'>

export default PasswordChangedEmail
