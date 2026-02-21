import { Button, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './email-layout'

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
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Bienvenue sur <b>Petit Meme</b> ! Avant de commencer à explorer et
          créer tes mèmes, tu dois <b>confirmer ton adresse e-mail</b>.
        </Text>
        <Button
          className="box-border inline-block rounded-lg bg-brand-button px-5 py-3.5 text-center text-sm font-medium text-brand-button-foreground no-underline"
          href={verificationUrl}
        >
          Confirmer mon inscription
        </Button>
        <Text className="m-0 mt-3 text-xs leading-5 text-brand-muted">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :{' '}
          <Link href={verificationUrl} className="text-brand-muted underline">
            {verificationUrl}
          </Link>
        </Text>
        <Text className="m-0 mt-4 text-base leading-7 text-neutral-700">
          Si tu n'as pas créé de compte sur Petit Meme, ignore simplement ce
          message.
        </Text>
        <Text className="m-0 mt-4 text-base leading-7 text-neutral-700">
          À très vite pour des mèmes légendaires !
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
