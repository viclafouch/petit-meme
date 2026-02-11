import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text
} from '@react-email/components'
import { baseUrl, styles } from './_utils'

type ResetPasswordProps = {
  username: string
  resetUrl: string
}

export const ResetPassword = ({ username, resetUrl }: ResetPasswordProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Preview>Réinitialise ton mot de passe Petit Meme</Preview>
        <Container style={styles.container}>
          <Img
            src={`${baseUrl}/images/logo.png`}
            width="40"
            height="40"
            alt="Petit Meme"
          />
          <Section>
            <Text style={styles.text}>Salut {username},</Text>
            <Text style={styles.text}>
              Tu as demandé à <b>réinitialiser ton mot de passe</b> sur{' '}
              <b>Petit Meme</b>. Clique sur le bouton ci-dessous pour en créer
              un nouveau.
            </Text>
            <Button style={styles.button} href={resetUrl}>
              Réinitialiser mon mot de passe
            </Button>
            <Text style={styles.text}>
              Si tu n’es pas à l’origine de cette demande, ignore simplement ce
              message. Ton mot de passe actuel restera valide.
            </Text>
            <Text style={styles.text}>
              Pour protéger ton compte, ce lien est temporaire et ne peut être
              utilisé qu’une seule fois.
            </Text>
            <Text style={styles.text}>
              À très vite pour partager encore plus de mèmes !
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

ResetPassword.PreviewProps = {
  username: 'Alan',
  resetUrl: 'https://petit-meme.io'
} as ResetPasswordProps

export default ResetPassword
