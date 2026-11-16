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
    preview: 'Plus qu’une étape pour rejoindre Petit Meme.',
    heading: 'Confirme ton adresse e-mail',
    body: 'Plus qu’une étape pour rejoindre **Petit Meme** : confirme ton adresse e-mail et commence à explorer les mèmes.',
    cta: 'Confirmer mon adresse',
    ignore: 'Tu n’as pas créé de compte sur Petit Meme ? Ignore ce message.'
  },
  en: {
    preview: 'One more step to join Petit Meme.',
    heading: 'Confirm your email address',
    body: 'One more step to join **Petit Meme**: confirm your email address and start exploring memes.',
    cta: 'Confirm my address',
    ignore: 'Didn’t create a Petit Meme account? Ignore this message.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type EmailVerificationProps = {
  verificationUrl: string
  locale: Locale
}

export const EmailVerification = ({
  verificationUrl,
  locale
}: EmailVerificationProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body} />
      </EmailParagraph>
      <EmailButton href={verificationUrl}>{tr.cta}</EmailButton>
      <EmailFallbackLink href={verificationUrl} locale={locale} />
      <EmailNote>{tr.ignore}</EmailNote>
    </EmailLayout>
  )
}

EmailVerification.PreviewProps = {
  verificationUrl: 'https://petit-meme.io/verify-email?token=abc123',
  locale: 'fr'
} satisfies EmailVerificationProps

type EmailVerificationENProps = Omit<EmailVerificationProps, 'locale'>

export const EmailVerificationEN = (props: EmailVerificationENProps) => {
  return <EmailVerification {...props} locale="en" />
}

EmailVerificationEN.PreviewProps = {
  verificationUrl: 'https://petit-meme.io/verify-email?token=abc123'
} satisfies EmailVerificationENProps

export default EmailVerification
