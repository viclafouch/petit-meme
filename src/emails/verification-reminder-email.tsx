import type { Locale } from '~/paraglide/runtime'
import { Button, Section, Text } from '@react-email/components'
import {
  BoldText,
  BUTTON_CLASS,
  EmailFallbackLink,
  EmailLayout
} from './email-layout'

const translations = {
  fr: {
    preview: 'Rappel : confirme ton email Petit Meme',
    title: 'Rappel : confirme ton adresse e-mail',
    subtitle: 'Tu n’as pas encore confirmé ton adresse e-mail.',
    body: (username: string) => {
      return `Salut ${username}, tu t’es inscrit sur **Petit Meme** mais tu n’as pas encore confirmé ton adresse e-mail. Clique sur le bouton ci-dessous pour confirmer et accéder à toutes les fonctionnalités.`
    },
    warning:
      'Si tu ne confirmes pas dans les 30 jours suivant ton inscription, ton compte sera automatiquement supprimé.',
    cta: 'Confirmer mon adresse e-mail',
    ignore: 'Si tu n’as pas créé de compte sur Petit Meme, ignore ce message.'
  },
  en: {
    preview: 'Reminder: confirm your Petit Meme email',
    title: 'Reminder: confirm your email address',
    subtitle: 'You have not yet confirmed your email address.',
    body: (username: string) => {
      return `Hi ${username}, you signed up on **Petit Meme** but have not yet confirmed your email address. Click the button below to confirm and access all features.`
    },
    warning:
      'If you do not confirm within 30 days of signing up, your account will be automatically deleted.',
    cta: 'Confirm my email address',
    ignore:
      'If you didn’t create an account on Petit Meme, ignore this message.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type VerificationReminderEmailProps = {
  username: string
  verificationUrl: string
  locale: Locale
}

export const VerificationReminderEmail = ({
  username,
  verificationUrl,
  locale
}: VerificationReminderEmailProps) => {
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
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-danger">
          {tr.warning}
        </Text>
        <Section className="mb-6 mt-2">
          <Button className={BUTTON_CLASS} href={verificationUrl}>
            {tr.cta}
          </Button>
        </Section>
        <EmailFallbackLink href={verificationUrl} locale={locale} />
        <Text className="m-0 mt-6 text-xs leading-5 text-brand-muted">
          {tr.ignore}
        </Text>
      </Section>
    </EmailLayout>
  )
}

VerificationReminderEmail.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123',
  locale: 'fr'
} satisfies VerificationReminderEmailProps

export const VerificationReminderEmailEN = (
  props: Omit<VerificationReminderEmailProps, 'locale'>
) => {
  return <VerificationReminderEmail {...props} locale="en" />
}

VerificationReminderEmailEN.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123'
} satisfies Omit<VerificationReminderEmailProps, 'locale'>

export default VerificationReminderEmail
