import React from 'react'
import type { Locale } from '~/paraglide/runtime'
import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text
} from '@react-email/components'
import {
  BUTTON_CLASS,
  CONTACT_EMAIL,
  LOGO_URL,
  SITE_URL,
  TAILWIND_CONFIG
} from './constants'

const layoutTranslations = {
  fr: {
    fallbackLink:
      'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :',
    allRightsReserved: 'Tous droits réservés.'
  },
  en: {
    fallbackLink:
      'If the button doesn’t work, copy this link into your browser:',
    allRightsReserved: 'All rights reserved.'
  }
} as const satisfies Record<Locale, Record<string, string>>

type EmailLayoutProps = {
  preview: string
  locale: Locale
  children: React.ReactNode
}

export { BUTTON_CLASS, CONTACT_EMAIL, LOGO_URL, SITE_URL }

export const BoldText = ({ text }: { text: string }) => {
  const parts = text.split('**')

  return (
    <>
      {parts.map((part, index) => {
        return index % 2 === 1 ? <b key={index}>{part}</b> : part
      })}
    </>
  )
}

type EmailFallbackLinkProps = {
  href: string
  locale: Locale
}

export const EmailFallbackLink = ({ href, locale }: EmailFallbackLinkProps) => {
  const tr = layoutTranslations[locale]

  return (
    <>
      <Text className="m-0 text-xs leading-5 text-brand-muted">
        {tr.fallbackLink}
      </Text>
      <Row>
        <Column
          style={{
            tableLayout: 'fixed',
            width: '100%',
            maxWidth: '1px',
            wordBreak: 'break-all',
            overflowWrap: 'break-word'
          }}
        >
          <Text className="m-0 text-xs leading-5">
            <Link href={href} className="text-brand-muted underline">
              {href}
            </Link>
          </Text>
        </Column>
      </Row>
    </>
  )
}

export const EmailLayout = ({
  preview,
  locale,
  children
}: EmailLayoutProps) => {
  const tr = layoutTranslations[locale]

  return (
    <Html lang={locale}>
      <Tailwind config={TAILWIND_CONFIG}>
        <Head>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
        </Head>
        <Body className="mx-auto my-0 bg-neutral-100 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-140">
            <Section className="mb-8 text-center">
              <Link href={SITE_URL} className="no-underline">
                <Img
                  src={LOGO_URL}
                  width="56"
                  height="56"
                  alt="Petit Meme"
                  className="mx-auto"
                />
              </Link>
              <Text className="m-0 mt-2 text-sm font-semibold tracking-wide text-brand-muted-dark">
                Petit Meme
              </Text>
            </Section>
            <Section className="bg-white px-10 py-10">{children}</Section>
            <Section className="mt-8 text-center">
              <Text className="m-0 text-xs leading-6 text-brand-muted">
                <Link
                  href={SITE_URL}
                  className="text-brand-muted-dark underline"
                >
                  petit-meme.io
                </Link>
                <span className="mx-2 text-brand-border">·</span>
                <Link
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand-muted-dark underline"
                >
                  {CONTACT_EMAIL}
                </Link>
              </Text>
              <Hr className="mx-auto my-4 w-10 border-brand-border" />
              <Text className="m-0 text-xs leading-5 text-brand-muted">
                © {new Date().getFullYear()} Petit Meme. {tr.allRightsReserved}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
