import type { Locale } from '~/paraglide/runtime'
import {
  BoldText,
  EmailButton,
  EmailFallbackLink,
  EmailNote,
  EmailParagraph
} from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Choisis un nouveau mot de passe pour ton compte.',
    heading: 'Réinitialise ton mot de passe',
    body: 'Tu as demandé un nouveau mot de passe pour ton compte **Petit Meme**. Choisis-le avec le bouton ci-dessous.',
    cta: 'Réinitialiser mon mot de passe',
    expiry:
      'Ce lien expire dans **1 heure** et ne sert qu’une fois. Tu n’as rien demandé ? Ignore ce message, ton mot de passe reste le même.'
  },
  en: {
    preview: 'Choose a new password for your account.',
    heading: 'Reset your password',
    body: 'You asked for a new password for your **Petit Meme** account. Choose it with the button below.',
    cta: 'Reset my password',
    expiry:
      'This link expires in **1 hour** and works only once. Didn’t ask for it? Ignore this message, your password stays the same.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type ResetPasswordProps = {
  resetUrl: string
  locale: Locale
}

export const ResetPassword = ({ resetUrl, locale }: ResetPasswordProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body} />
      </EmailParagraph>
      <EmailButton href={resetUrl}>{tr.cta}</EmailButton>
      <EmailFallbackLink href={resetUrl} locale={locale} />
      <EmailNote>
        <BoldText text={tr.expiry} />
      </EmailNote>
    </EmailLayout>
  )
}

ResetPassword.PreviewProps = {
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123',
  locale: 'fr'
} satisfies ResetPasswordProps

type ResetPasswordENProps = Omit<ResetPasswordProps, 'locale'>

export const ResetPasswordEN = (props: ResetPasswordENProps) => {
  return <ResetPassword {...props} locale="en" />
}

ResetPasswordEN.PreviewProps = {
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123'
} satisfies ResetPasswordENProps

export default ResetPassword
