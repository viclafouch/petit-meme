import { Section, Text } from 'react-email'
import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
import { BoldText, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ta proposition de mème n’a pas été retenue',
    title: 'Proposition non retenue',
    subtitle: 'Ton mème n’a pas été ajouté au site.',
    body: (username: string, memeTitle: string) => {
      return `Salut ${username}, ta proposition **${memeTitle}** n’a malheureusement pas été retenue.`
    },
    reasons:
      'Les raisons peuvent inclure : contenu déjà présent, qualité insuffisante, ou non-conformité aux règles du site.',
    encourage:
      'N’hésite pas à proposer d’autres mèmes, chaque contribution compte !',
    contact: (email: string) => {
      return `Si tu as des questions, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your meme proposal was not accepted',
    title: 'Proposal not accepted',
    subtitle: 'Your meme was not added to the site.',
    body: (username: string, memeTitle: string) => {
      return `Hi ${username}, your proposal **${memeTitle}** was unfortunately not accepted.`
    },
    reasons:
      'Possible reasons include: content already present, insufficient quality, or non-compliance with site rules.',
    encourage: 'Feel free to propose other memes, every contribution counts!',
    contact: (email: string) => {
      return `If you have any questions, contact us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type ProposalRejectedEmailProps = {
  username: string
  memeTitle: string
  locale: Locale
}

export const ProposalRejectedEmail = ({
  username,
  memeTitle,
  locale
}: ProposalRejectedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} locale={locale}>
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand-danger">
          {tr.title}
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          {tr.subtitle}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.body(username, memeTitle)} />
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.reasons}
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.encourage}
        </Text>
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          <BoldText text={tr.contact(CONTACT_EMAIL)} />
        </Text>
      </Section>
    </EmailLayout>
  )
}

ProposalRejectedEmail.PreviewProps = {
  username: 'Alan',
  memeTitle: 'Le chat qui danse',
  locale: 'fr'
} satisfies ProposalRejectedEmailProps

type ProposalRejectedEmailENProps = Omit<ProposalRejectedEmailProps, 'locale'>

export const ProposalRejectedEmailEN = (
  props: ProposalRejectedEmailENProps
) => {
  return <ProposalRejectedEmail {...props} locale="en" />
}

ProposalRejectedEmailEN.PreviewProps = {
  username: 'Alan',
  memeTitle: 'The dancing cat'
} satisfies ProposalRejectedEmailENProps

export default ProposalRejectedEmail
