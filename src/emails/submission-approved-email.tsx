import { Link, Section, Text } from '@react-email/components'
import type { Locale } from '~/paraglide/runtime'
import { buildEmailUrl } from './constants'
import { BoldText, BUTTON_CLASS, EmailLayout } from './email-layout'

const translations = {
  fr: {
    preview: 'Ta proposition de mème a été acceptée !',
    title: 'Proposition acceptée',
    subtitle: 'Ton mème a été ajouté au site.',
    body: (username: string, memeTitle: string) => {
      return `Salut ${username}, ta proposition **${memeTitle}** a été acceptée et ajoutée à **Petit Meme** !`
    },
    thanks:
      'Merci pour ta contribution, elle aide à enrichir la collection de mèmes.',
    cta: 'Voir le mème'
  },
  en: {
    preview: 'Your meme submission has been approved!',
    title: 'Submission approved',
    subtitle: 'Your meme has been added to the site.',
    body: (username: string, memeTitle: string) => {
      return `Hi ${username}, your submission **${memeTitle}** has been approved and added to **Petit Meme**!`
    },
    thanks:
      'Thanks for your contribution, it helps enrich the meme collection.',
    cta: 'View the meme'
  }
} as const satisfies Record<Locale, Record<string, unknown>>

type SubmissionApprovedEmailProps = {
  username: string
  memeTitle: string
  memeId: string
  locale: Locale
}

export const SubmissionApprovedEmail = ({
  username,
  memeTitle,
  memeId,
  locale
}: SubmissionApprovedEmailProps) => {
  const tr = translations[locale]
  const memeUrl = buildEmailUrl(`/memes/${memeId}`, locale)

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
          <BoldText text={tr.body(username, memeTitle)} />
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          {tr.thanks}
        </Text>
        <Section className="mb-6 text-center">
          <Link href={memeUrl} className={BUTTON_CLASS}>
            {tr.cta}
          </Link>
        </Section>
      </Section>
    </EmailLayout>
  )
}

SubmissionApprovedEmail.PreviewProps = {
  username: 'Alan',
  memeTitle: 'Le chat qui danse',
  memeId: 'clx1234567890',
  locale: 'fr'
} satisfies SubmissionApprovedEmailProps

export const SubmissionApprovedEmailEN = (
  props: Omit<SubmissionApprovedEmailProps, 'locale'>
) => {
  return <SubmissionApprovedEmail {...props} locale="en" />
}

SubmissionApprovedEmailEN.PreviewProps = {
  username: 'Alan',
  memeTitle: 'The dancing cat',
  memeId: 'clx1234567890'
} satisfies Omit<SubmissionApprovedEmailProps, 'locale'>

export default SubmissionApprovedEmail
