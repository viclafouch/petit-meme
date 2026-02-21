import { Button, Link, Section, Text } from '@react-email/components'
import { EmailLayout, SITE_URL } from './email-layout'

type WelcomeEmailProps = {
  username: string
}

export const WelcomeEmail = ({ username }: WelcomeEmailProps) => {
  return (
    <EmailLayout preview="Bienvenue sur Petit Meme !">
      <Section>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Salut {username},
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Ton compte est maintenant vérifié. Bienvenue sur <b>Petit Meme</b> !
        </Text>
        <Text className="m-0 mb-4 text-base leading-7 text-neutral-700">
          Tu peux maintenant explorer des milliers de mèmes, sauvegarder tes
          favoris et partager les meilleurs avec tes amis.
        </Text>
        <Button
          className="box-border inline-block rounded-lg bg-brand-button px-5 py-3.5 text-center text-sm font-medium text-brand-button-foreground no-underline"
          href={SITE_URL}
        >
          Découvrir les mèmes
        </Button>
        <Text className="m-0 mt-3 text-xs leading-5 text-brand-muted">
          Ou visite directement{' '}
          <Link href={SITE_URL} className="text-brand-muted underline">
            petit-meme.io
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  username: 'Alan'
} satisfies WelcomeEmailProps

export default WelcomeEmail
