import type { Locale } from '~/paraglide/runtime'
import { Link, Section, Text } from '@react-email/components'
import {
  BoldText,
  BUTTON_CLASS,
  CONTACT_EMAIL,
  EmailLayout,
  SITE_URL
} from './email-layout'

const translations = {
  fr: {
    preview: 'Ton compte Petit Meme a été réactivé',
    title: 'Compte réactivé',
    subtitle: 'Bonne nouvelle, ton compte est de nouveau actif !',
    body: (username: string) => {
      return `Salut ${username}, la suspension de ton compte **Petit Meme** a été levée. Tu peux de nouveau te connecter et utiliser le site.`
    },
    cta: 'Se connecter',
    contact: (email: string) => {
      return `Si tu as des questions, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your Petit Meme account has been reactivated',
    title: 'Account reactivated',
    subtitle: 'Good news, your account is active again!',
    body: (username: string) => {
      return `Hi ${username}, the suspension on your **Petit Meme** account has been lifted. You can sign in and use the site again.`
    },
    cta: 'Sign in',
    contact: (email: string) => {
      return `If you have any questions, contact us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type AccountUnbannedEmailProps = {
  username: string
  locale: Locale
}

export const AccountUnbannedEmail = ({
  username,
  locale
}: AccountUnbannedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand-success">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.body(username)} />
        </Text>
        <Section className="mb-6 text-center">
          <Link href={SITE_URL} className={BUTTON_CLASS}>
            {tr.cta}
          </Link>
        </Section>
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.contact(CONTACT_EMAIL)} />
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountUnbannedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies AccountUnbannedEmailProps

export const AccountUnbannedEmailEN = (
  props: Omit<AccountUnbannedEmailProps, 'locale'>
) => {
  return <AccountUnbannedEmail {...props} locale="en" />
}

AccountUnbannedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies Omit<AccountUnbannedEmailProps, 'locale'>

export default AccountUnbannedEmail
