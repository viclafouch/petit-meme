import { Button, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailFallbackLink, EmailLayout } from './email-layout'

type EmailVerificationProps = {
  username: string
  verificationUrl: string
}

export const EmailVerification = ({
  username,
  verificationUrl
}: EmailVerificationProps) => {
  return (
    <EmailLayout preview="Confirme ton inscription à Petit Meme">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Confirme ton adresse e-mail
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Plus qu'une étape pour rejoindre Petit Meme.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, bienvenue sur <b>Petit Meme</b> ! Clique sur le
          bouton ci-dessous pour confirmer ton adresse e-mail et commencer à
          explorer les mèmes.
        </Text>
        <Section className="mb-6 mt-2">
          <Button className={BUTTON_CLASS} href={verificationUrl}>
            Confirmer mon inscription
          </Button>
        </Section>
        <EmailFallbackLink href={verificationUrl} />
        <Text className="m-0 mt-6 text-xs leading-5 text-brand-muted">
          Si tu n'as pas créé de compte sur Petit Meme, ignore ce message.
        </Text>
      </Section>
    </EmailLayout>
  )
}

EmailVerification.PreviewProps = {
  username: 'Alan',
  verificationUrl: 'https://petit-meme.io/api/auth/verify-email?token=abc123'
} satisfies EmailVerificationProps

export default EmailVerification
