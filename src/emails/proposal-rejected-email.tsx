import type { Locale } from '~/paraglide/runtime'
import { CONTACT_EMAIL } from './constants'
import { BoldText, EmailNote, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton mème ne rejoindra pas la bibliothèque.',
    heading: 'Ta proposition n’a pas été retenue',
    body: (username: string, memeTitle: string) => {
      return `Salut ${username}, **${memeTitle}** ne rejoindra pas la bibliothèque de **Petit Meme**.`
    },
    reasons:
      'Le plus souvent, le mème y est déjà, la vidéo manque de qualité ou elle ne respecte pas les règles du site.',
    encourage: 'Tu peux proposer d’autres mèmes à tout moment.',
    contact: (email: string) => {
      return `Une question ? Écris-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your meme won’t join the library.',
    heading: 'Your proposal wasn’t accepted',
    body: (username: string, memeTitle: string) => {
      return `Hi ${username}, **${memeTitle}** won’t join the **Petit Meme** library.`
    },
    reasons:
      'Most often, the meme is already there, the video lacks quality or it breaks the site rules.',
    encourage: 'You can propose other memes at any time.',
    contact: (email: string) => {
      return `A question? Write to us at **${email}**.`
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
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username, memeTitle)} />
      </EmailParagraph>
      <EmailParagraph>{tr.reasons}</EmailParagraph>
      <EmailParagraph>{tr.encourage}</EmailParagraph>
      <EmailNote>
        <BoldText text={tr.contact(CONTACT_EMAIL)} />
      </EmailNote>
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
