import { Button, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './email-layout'

type ResetPasswordProps = {
  username: string
  resetUrl: string
}

export const ResetPassword = ({ username, resetUrl }: ResetPasswordProps) => {
  return (
    <EmailLayout preview="Réinitialise ton mot de passe Petit Meme">
      <Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Tu as demandé à <b>réinitialiser ton mot de passe</b> sur{' '}
          <b>Petit Meme</b>. Clique sur le bouton ci-dessous pour en créer un
          nouveau.
        </Text>
        <Button
          className="box-border inline-block rounded-lg bg-brand-button px-5 py-3.5 text-center text-sm font-medium text-brand-button-foreground no-underline"
          href={resetUrl}
        >
          Réinitialiser mon mot de passe
        </Button>
        <Text className="m-0 mt-3 text-xs leading-5 text-brand-muted">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :{' '}
          <Link href={resetUrl} className="text-brand-muted underline">
            {resetUrl}
          </Link>
        </Text>
        <Text className="m-0 mt-4 text-base leading-7 text-neutral-700">
          Ce lien expire dans <b>1 heure</b> et ne peut être utilisé qu'une
          seule fois.
        </Text>
        <Text className="m-0 mt-4 text-base leading-7 text-neutral-700">
          Si tu n'es pas à l'origine de cette demande, ignore simplement ce
          message. Ton mot de passe actuel restera valide.
        </Text>
      </Section>
    </EmailLayout>
  )
}

ResetPassword.PreviewProps = {
  username: 'Alan',
  resetUrl: 'https://petit-meme.io/reset-password?token=abc123'
} satisfies ResetPasswordProps

export default ResetPassword
