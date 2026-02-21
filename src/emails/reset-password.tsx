import { Button, Link, Section, Text } from '@react-email/components'
import { BUTTON_CLASS, EmailLayout } from './email-layout'

type ResetPasswordProps = {
  username: string
  resetUrl: string
}

export const ResetPassword = ({ username, resetUrl }: ResetPasswordProps) => {
  return (
    <EmailLayout preview="Réinitialise ton mot de passe Petit Meme">
      <Section>
        <Text className="m-0 mb-2 text-lg font-semibold text-brand">
          Réinitialisation du mot de passe
        </Text>
        <Text className="m-0 mb-6 text-sm leading-6 text-brand-muted-dark">
          Tu as demandé un nouveau mot de passe.
        </Text>
        <Text className="m-0 mb-4 text-sm leading-6 text-neutral-600">
          Salut {username}, clique sur le bouton ci-dessous pour créer un
          nouveau mot de passe pour ton compte <b>Petit Meme</b>.
        </Text>
        <Section className="mb-6 mt-2">
          <Button className={BUTTON_CLASS} href={resetUrl}>
            Réinitialiser mon mot de passe
          </Button>
        </Section>
        <Text className="m-0 text-xs leading-5 text-brand-muted">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :
        </Text>
        <Text className="m-0 text-xs leading-5">
          <Link href={resetUrl} className="text-brand-muted underline">
            {resetUrl}
          </Link>
        </Text>
        <Section className="mt-6 rounded-lg border border-solid border-brand-border bg-neutral-50 p-4">
          <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
            Ce lien expire dans <b>1 heure</b> et ne peut être utilisé qu'une
            seule fois. Si tu n'es pas à l'origine de cette demande, ignore ce
            message.
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}

ResetPassword.PreviewProps = {
  username: 'Alan',
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123'
} satisfies ResetPasswordProps

export default ResetPassword
