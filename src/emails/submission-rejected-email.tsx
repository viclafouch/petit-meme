import type { Locale } from '@/paraglide/runtime'
import { Section, Text } from '@react-email/components'
import { BoldText, CONTACT_EMAIL, EmailLayout } from './email-layout'

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
      'N’hésite pas à soumettre d’autres propositions, chaque contribution compte !',
    contact: (email: string) => {
      return `Si tu as des questions, contacte-nous à **${email}**.`
    }
  },
  en: {
    preview: 'Your meme submission was not accepted',
    title: 'Submission not accepted',
    subtitle: 'Your meme was not added to the site.',
    body: (username: string, memeTitle: string) => {
      return `Hi ${username}, your submission **${memeTitle}** was unfortunately not accepted.`
    },
    reasons:
      'Possible reasons include: content already present, insufficient quality, or non-compliance with site rules.',
    encourage:
      'Feel free to submit other suggestions, every contribution counts!',
    contact: (email: string) => {
      return `If you have any questions, contact us at **${email}**.`
    }
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type SubmissionRejectedEmailProps = {
  username: string
  memeTitle: string
  locale: Locale
}

export const SubmissionRejectedEmail = ({
  username,
  memeTitle,
  locale
}: SubmissionRejectedEmailProps) => {
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

SubmissionRejectedEmail.PreviewProps = {
  username: 'Alan',
  memeTitle: 'Le chat qui danse',
  locale: 'fr'
} satisfies SubmissionRejectedEmailProps

export const SubmissionRejectedEmailEN = (
  props: Omit<SubmissionRejectedEmailProps, 'locale'>
) => {
  return <SubmissionRejectedEmail {...props} locale="en" />
}

SubmissionRejectedEmailEN.PreviewProps = {
  username: 'Alan',
  memeTitle: 'The dancing cat'
} satisfies Omit<SubmissionRejectedEmailProps, 'locale'>

export default SubmissionRejectedEmail
