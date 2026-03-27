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
    preview: 'Réinitialise ton mot de passe Petit Meme',
    title: 'Réinitialisation du mot de passe',
    subtitle: 'Tu as demandé un nouveau mot de passe.',
    body: (username: string) => {
      return `Salut ${username}, clique sur le bouton ci-dessous pour créer un nouveau mot de passe pour ton compte **Petit Meme**.`
    },
    cta: 'Réinitialiser mon mot de passe',
    expiry:
      'Ce lien expire dans **1 heure** et ne peut être utilisé qu’une seule fois. Si tu n’es pas à l’origine de cette demande, ignore ce message.'
  },
  en: {
    preview: 'Reset your Petit Meme password',
    title: 'Password reset',
    subtitle: 'You requested a new password.',
    body: (username: string) => {
      return `Hi ${username}, click the button below to create a new password for your **Petit Meme** account.`
    },
    cta: 'Reset my password',
    expiry:
      'This link expires in **1 hour** and can only be used once. If you did not request this, ignore this message.'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type ResetPasswordProps = {
  username: string
  resetUrl: string
  locale: Locale
}

export const ResetPassword = ({
  username,
  resetUrl,
  locale
}: ResetPasswordProps) => {
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
          <Button className={BUTTON_CLASS} href={resetUrl}>
            {tr.cta}
          </Button>
        </Section>
        <EmailFallbackLink href={resetUrl} locale={locale} />
        <Section className="mt-6 rounded-lg border border-solid border-brand-border bg-neutral-50 p-4">
          <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
            <BoldText text={tr.expiry} />
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}

ResetPassword.PreviewProps = {
  username: 'Alan',
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123',
  locale: 'fr'
} satisfies ResetPasswordProps

export const ResetPasswordEN = (props: Omit<ResetPasswordProps, 'locale'>) => {
  return <ResetPassword {...props} locale="en" />
}

ResetPasswordEN.PreviewProps = {
  username: 'Alan',
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123'
} satisfies Omit<ResetPasswordProps, 'locale'>

export default ResetPassword
