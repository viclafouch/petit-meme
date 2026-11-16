import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl } from './constants'
import { EmailButton, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton compte Petit Meme est prêt.',
    heading: (username: string) => {
      return `Bienvenue, ${username} !`
    },
    body: 'Ton compte est prêt. Explore des milliers de mèmes vidéo, garde tes préférés en favoris et partage les meilleurs avec tes amis.',
    cta: 'Découvrir les mèmes'
  },
  en: {
    preview: 'Your Petit Meme account is ready.',
    heading: (username: string) => {
      return `Welcome, ${username}!`
    },
    body: 'Your account is ready. Explore thousands of video memes, bookmark your favorites and share the best ones with your friends.',
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
    <EmailLayout
      preview={tr.preview}
      heading={tr.heading(username)}
      locale={locale}
    >
      <EmailParagraph>{tr.body}</EmailParagraph>
      <EmailButton href={buildEmailUrl('/', locale)}>{tr.cta}</EmailButton>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies WelcomeEmailProps

type WelcomeEmailENProps = Omit<WelcomeEmailProps, 'locale'>

export const WelcomeEmailEN = (props: WelcomeEmailENProps) => {
  return <WelcomeEmail {...props} locale="en" />
}

WelcomeEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies WelcomeEmailENProps

export default WelcomeEmail
