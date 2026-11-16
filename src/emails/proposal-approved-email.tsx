import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl } from './constants'
import { BoldText, EmailButton, EmailParagraph } from './email-blocks'
import { EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ton mème a rejoint la bibliothèque.',
    heading: 'Ta proposition est en ligne',
    body: (username: string, memeTitle: string) => {
      return `Salut ${username}, **${memeTitle}** a rejoint la bibliothèque de **Petit Meme**. Merci pour ta contribution !`
    },
    cta: 'Voir le mème'
  },
  en: {
    preview: 'Your meme has joined the library.',
    heading: 'Your proposal is live',
    body: (username: string, memeTitle: string) => {
      return `Hi ${username}, **${memeTitle}** has joined the **Petit Meme** library. Thanks for your contribution!`
    },
    cta: 'View the meme'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type ProposalApprovedEmailProps = {
  username: string
  memeTitle: string
  memeId: string
  locale: Locale
}

export const ProposalApprovedEmail = ({
  username,
  memeTitle,
  memeId,
  locale
}: ProposalApprovedEmailProps) => {
  const tr = translations[locale]

  return (
    <EmailLayout preview={tr.preview} heading={tr.heading} locale={locale}>
      <EmailParagraph>
        <BoldText text={tr.body(username, memeTitle)} />
      </EmailParagraph>
      <EmailButton href={buildEmailUrl(`/memes/${memeId}`, locale)}>
        {tr.cta}
      </EmailButton>
    </EmailLayout>
  )
}

ProposalApprovedEmail.PreviewProps = {
  username: 'Alan',
  memeTitle: 'Le chat qui danse',
  memeId: 'clx1234567890',
  locale: 'fr'
} satisfies ProposalApprovedEmailProps

type ProposalApprovedEmailENProps = Omit<ProposalApprovedEmailProps, 'locale'>

export const ProposalApprovedEmailEN = (
  props: ProposalApprovedEmailENProps
) => {
  return <ProposalApprovedEmail {...props} locale="en" />
}

ProposalApprovedEmailEN.PreviewProps = {
  username: 'Alan',
  memeTitle: 'The dancing cat',
  memeId: 'clx1234567890'
} satisfies ProposalApprovedEmailENProps

export default ProposalApprovedEmail
