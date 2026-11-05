import { Button, Column, Hr, Row, Section, Text } from 'react-email'
import type { Locale } from '~/paraglide/runtime'
import { BUTTON_CLASS, buildEmailUrl } from './constants'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Un cadeau t’attend : Petit Meme Premium, à vie',
    greeting: (username: string) => {
      return `Salut ${username},`
    },
    lead: 'Victor t’offre Petit Meme Premium, à vie. Pas d’abonnement, pas de carte bancaire : c’est déjà actif sur ton compte.',
    cardTitle: 'Premium',
    cardTag: 'À vie',
    cardFrom: 'Un cadeau de Victor',
    perksTitle: 'Ce qui change pour toi',
    perks: [
      'Téléchargements et partages sans watermark',
      'Son des mèmes en MP3',
      'Favoris et générations illimités',
      'Recherche IA sans limite'
    ],
    cta: 'Profiter de Premium'
  },
  en: {
    preview: 'A gift is waiting: Petit Meme Premium, for life',
    greeting: (username: string) => {
      return `Hi ${username},`
    },
    lead: 'Victor is giving you Petit Meme Premium, for life. No subscription, no card: it is already active on your account.',
    cardTitle: 'Premium',
    cardTag: 'For life',
    cardFrom: 'A gift from Victor',
    perksTitle: 'What changes for you',
    perks: [
      'Downloads and shares without watermark',
      'Meme sound as MP3',
      'Unlimited favorites and generations',
      'Unlimited AI search'
    ],
    cta: 'Enjoy Premium'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

const GIFT_BADGE_SIZE = 72

const CARD_DIVIDER_COLOR = '#404040'

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
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-base font-semibold text-brand">
          {tr.greeting(username)}
        </Text>
        <Text className="m-0 mb-8 text-sm leading-6 text-neutral-600">
          {tr.lead}
        </Text>
        <Section className="mb-8 rounded-2xl bg-brand px-8 py-10 text-center">
          <Section
            className="rounded-full bg-amber-400"
            style={{ width: GIFT_BADGE_SIZE, height: GIFT_BADGE_SIZE }}
          >
            <Text
              className="m-0 text-center text-4xl"
              style={{ lineHeight: `${GIFT_BADGE_SIZE}px` }}
            >
              🎁
            </Text>
          </Section>
          <Text className="m-0 mt-6 text-4xl font-bold tracking-tight text-brand-foreground">
            {tr.cardTitle}
          </Text>
          <Text className="m-0 mt-3">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-brand">
              {tr.cardTag}
            </span>
          </Text>
          <Hr
            className="my-8"
            style={{ borderTop: `1px dashed ${CARD_DIVIDER_COLOR}` }}
          />
          <Text className="m-0 text-sm text-brand-muted">{tr.cardFrom}</Text>
        </Section>
        <Text className="m-0 mb-4 text-sm font-semibold text-brand">
          {tr.perksTitle}
        </Text>
        {tr.perks.map((perk) => {
          return (
            <Row key={perk} className="mb-3">
              <Column className="w-7 align-top">
                <Text className="m-0 text-sm leading-6 font-bold text-amber-500">
                  ✓
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-sm leading-6 text-neutral-600">
                  {perk}
                </Text>
              </Column>
            </Row>
          )
        })}
        <Section className="mt-8 text-center">
          <Button className={BUTTON_CLASS} href={buildEmailUrl('/', locale)}>
            {tr.cta}
          </Button>
        </Section>
      </Section>
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
