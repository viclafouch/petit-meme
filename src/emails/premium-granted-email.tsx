import { Column, Row, Section, Text } from 'react-email'
import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl } from './constants'
import { EmailButton, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Un cadeau t’attend : Petit Meme Premium, à vie.',
    heading: 'Premium t’est offert, à vie',
    lead: (username: string) => {
      return `Salut ${username}, Victor t’offre Petit Meme Premium, à vie. Pas d’abonnement, pas de carte bancaire : c’est déjà actif sur ton compte.`
    },
    perks: [
      'Téléchargements et partages sans watermark',
      'Son des mèmes en MP3',
      'Favoris et générations illimités',
      'Recherche IA sans limite'
    ],
    cta: 'Profiter de Premium'
  },
  en: {
    preview: 'A gift is waiting: Petit Meme Premium, for life.',
    heading: 'Premium is yours, for life',
    lead: (username: string) => {
      return `Hi ${username}, Victor is giving you Petit Meme Premium, for life. No subscription, no card: it is already active on your account.`
    },
    perks: [
      'Downloads and shares without watermark',
      'Meme sound as MP3',
      'Unlimited bookmarks and generations',
      'Unlimited AI search'
    ],
    cta: 'Enjoy Premium'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type PremiumGrantedEmailProps = {
  username: string
  locale: Locale
}

export const PremiumGrantedEmail = ({
  username,
  locale
}: PremiumGrantedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>{tr.lead(username)}</EmailParagraph>
      <Section className="my-6 border-0 border-b border-solid border-brand-border">
        {tr.perks.map((perk) => {
          return (
            <Row
              key={perk}
              className="border-0 border-t border-solid border-brand-border"
            >
              <Column className="w-6 py-3 align-top">
                <Text className="m-0 text-sm leading-5 font-bold text-brand-success">
                  ✓
                </Text>
              </Column>
              <Column className="py-3 align-top">
                <Text className="m-0 text-sm leading-5 text-brand">{perk}</Text>
              </Column>
            </Row>
          )
        })}
      </Section>
      <EmailButton href={buildEmailUrl('/', locale)}>{tr.cta}</EmailButton>
    </EmailLayout>
  )
}

PremiumGrantedEmail.PreviewProps = {
  username: 'Alan',
  locale: 'fr'
} satisfies PremiumGrantedEmailProps

type PremiumGrantedEmailENProps = Omit<PremiumGrantedEmailProps, 'locale'>

export const PremiumGrantedEmailEN = (props: PremiumGrantedEmailENProps) => {
  return <PremiumGrantedEmail {...props} locale="en" />
}

PremiumGrantedEmailEN.PreviewProps = {
  username: 'Alan'
} satisfies PremiumGrantedEmailENProps

export default PremiumGrantedEmail
