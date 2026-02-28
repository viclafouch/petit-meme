import { Link, Section, Text } from '@react-email/components'
import {
  BUTTON_CLASS,
  CONTACT_EMAIL,
  EmailLayout,
  SITE_URL
} from './email-layout'

type AccountUnbannedEmailProps = {
  username: string
}

export const AccountUnbannedEmail = ({
  username
}: AccountUnbannedEmailProps) => {
  return (
    <EmailLayout preview="Ton compte Petit Meme a été réactivé">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand-success">
          Compte réactivé
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Bonne nouvelle, ton compte est de nouveau actif !
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, la suspension de ton compte <b>Petit Meme</b> a été
          levée. Tu peux de nouveau te connecter et utiliser le site.
        </Text>
        <Section className="mb-6 text-center">
          <Link href={SITE_URL} className={BUTTON_CLASS}>
            Se connecter
          </Link>
        </Section>
        <Text className="m-0 text-sm leading-6 text-neutral-600">
          Si tu as des questions, contacte-nous à <b>{CONTACT_EMAIL}</b>.
        </Text>
      </Section>
    </EmailLayout>
  )
}

AccountUnbannedEmail.PreviewProps = {
  username: 'Alan'
} satisfies AccountUnbannedEmailProps

export default AccountUnbannedEmail
