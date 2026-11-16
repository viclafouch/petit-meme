import type { Locale } from '~/paraglide/runtime'
import {
  BoldText,
  EmailButton,
  EmailCallout,
  EmailFallbackLink,
  EmailNote,
  EmailParagraph
} from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Confirme ton adresse e-mail pour garder ton compte.',
    heading: 'Ton adresse e-mail attend sa confirmation',
    body: 'Ton inscription sur **Petit Meme** n’est pas encore confirmée. Confirme ton adresse e-mail pour garder ton compte et toutes ses fonctionnalités.',
    warning:
      'Sans confirmation dans les 30 jours qui suivent l’inscription, le compte est supprimé automatiquement.',
    cta: 'Confirmer mon adresse',
    ignore: 'Tu n’as pas créé de compte sur Petit Meme ? Ignore ce message.'
  },
  en: {
    preview: 'Confirm your email address to keep your account.',
    heading: 'Your email address is waiting for confirmation',
    body: 'Your **Petit Meme** sign-up is not confirmed yet. Confirm your email address to keep your account and all its features.',
    warning:
      'Without confirmation within 30 days of signing up, the account is deleted automatically.',
    cta: 'Confirm my address',
    ignore: 'Didn’t create a Petit Meme account? Ignore this message.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type VerificationReminderEmailProps = {
  verificationUrl: string
  locale: Locale
}

export const VerificationReminderEmail = ({
  verificationUrl,
  locale
}: VerificationReminderEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body} />
      </EmailParagraph>
      <EmailCallout tone="danger">{tr.warning}</EmailCallout>
      <EmailButton href={verificationUrl}>{tr.cta}</EmailButton>
      <EmailFallbackLink href={verificationUrl} locale={locale} />
      <EmailNote>{tr.ignore}</EmailNote>
    </EmailLayout>
  )
}

VerificationReminderEmail.PreviewProps = {
  verificationUrl: 'https://petit-meme.io/verify-email?token=abc123',
  locale: 'fr'
} satisfies VerificationReminderEmailProps

type VerificationReminderEmailENProps = Omit<
  VerificationReminderEmailProps,
  'locale'
>

export const VerificationReminderEmailEN = (
  props: VerificationReminderEmailENProps
) => {
  return <VerificationReminderEmail {...props} locale="en" />
}

VerificationReminderEmailEN.PreviewProps = {
  verificationUrl: 'https://petit-meme.io/verify-email?token=abc123'
} satisfies VerificationReminderEmailENProps

export default VerificationReminderEmail
