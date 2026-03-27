import { Button, Section, Text } from '@react-email/components'
import type { Locale } from '~/paraglide/runtime'
import {
  BoldText,
  BUTTON_CLASS,
  EmailFallbackLink,
  EmailLayout
} from './email-layout'

const translations = {
  fr: {
    preview: 'Confirme ton inscription à Petit Meme',
    title: 'Confirme ton adresse e-mail',
    subtitle: 'Plus qu’une étape pour rejoindre Petit Meme.',
    body: (username: string) => {
      return `Salut ${username}, bienvenue sur **Petit Meme** ! Clique sur le bouton ci-dessous pour confirmer ton adresse e-mail et commencer à explorer les mèmes.`
    },
    cta: 'Confirmer mon inscription',
    ignore: 'Si tu n’as pas créé de compte sur Petit Meme, ignore ce message.'
  },
  en: {
    preview: 'Confirm your Petit Meme registration',
    title: 'Confirm your email address',
    subtitle: 'One more step to join Petit Meme.',
    body: (username: string) => {
      return `Hi ${username}, welcome to **Petit Meme**! Click the button below to confirm your email address and start exploring memes.`
    },
    cta: 'Confirm my registration',
    ignore:
      'If you didn’t create an account on Petit Meme, ignore this message.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type EmailVerificationProps = {
  username: string
  verificationUrl: string
  locale: Locale
}

export const EmailVerification = ({
  username,
  verificationUrl,
  locale
}: EmailVerificationProps) => {
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

EmailVerification.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123',
  locale: 'fr'
} satisfies EmailVerificationProps

export const EmailVerificationEN = (
  props: Omit<EmailVerificationProps, 'locale'>
) => {
  return <EmailVerification {...props} locale="en" />
}

EmailVerificationEN.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123'
} satisfies Omit<EmailVerificationProps, 'locale'>

export default EmailVerification
