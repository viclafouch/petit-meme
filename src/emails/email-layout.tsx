import React from 'react'
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text
} from '@react-email/components'

type EmailLayoutProps = {
  preview: string
  children: React.ReactNode
}

export const SITE_URL = 'https://petit-meme.io'

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: '#0a0a0a',
        'brand-foreground': '#fafafa',
        'brand-muted': '#737373',
        'brand-border': '#e5e5e5',
        'brand-button': '#0a0a0a',
        'brand-button-foreground': '#fafafa',
        'brand-danger': '#dc2626',
        'brand-danger-bg': '#fef2f2',
        'brand-danger-border': '#fecaca'
      }
    }
  }
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html lang="fr">
      <Tailwind config={tailwindConfig}>
        <Head>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
        </Head>
        <Body className="mx-auto my-0 bg-neutral-100 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-140 rounded-lg border border-solid border-brand-border bg-white p-10">
            <Section>
              <Text className="m-0 mb-6 text-xl font-bold text-brand">
                Petit Meme
              </Text>
            </Section>
            {children}
            <Section className="mt-8 border-none border-t border-brand-border pt-6">
              <Text className="m-0 text-xs text-brand-muted">
                <Link href={SITE_URL} className="text-brand-muted underline">
                  petit-meme.io
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
