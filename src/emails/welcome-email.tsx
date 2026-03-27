import type { Locale } from '~/paraglide/runtime'
import { Button, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailLayout, SITE_URL } from './email-layout'

const translations = {
  fr: {
    preview: 'Bienvenue sur Petit Meme !',
    title: (username: string) => {
      return `Bienvenue, ${username} !`
    },
    subtitle: 'Ton compte est vérifié et prêt à l’emploi.',
    body: 'Tu peux maintenant explorer des milliers de mèmes vidéo, sauvegarder tes favoris et partager les meilleurs avec tes amis.',
    cta: 'Découvrir les mèmes'
  },
  en: {
    preview: 'Welcome to Petit Meme!',
    title: (username: string) => {
      return `Welcome, ${username}!`
    },
    subtitle: 'Your account is verified and ready to go.',
    body: 'You can now explore thousands of video memes, save your favorites and share the best ones with your friends.',
    cta: 'Discover memes'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type WelcomeEmailProps = {
  username: string
  locale: Locale
}

export const WelcomeEmail = ({ username, locale }: WelcomeEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          {tr.title(username)}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.body}
        </Text>
        <Section className="mt-2">
          <Button className={BUTTON_CLASS} href={SITE_URL}>
            {tr.cta}
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies WelcomeEmailProps

export const WelcomeEmailEN = (props: Omit<WelcomeEmailProps, 'locale'>) => {
  return <WelcomeEmail {...props} locale="en" />
}

WelcomeEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies Omit<WelcomeEmailProps, 'locale'>

export default WelcomeEmail
