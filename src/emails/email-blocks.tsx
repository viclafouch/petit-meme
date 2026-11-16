import type React from 'react'
import { Button, Column, Link, Row, Section, Text } from 'react-email'
import type { Locale } from '~/paraglide/runtime'
import { TABULAR_STYLE } from './constants'

const blockTranslations = {
  fr: {
    fallbackLink:
      'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :'
  },
  en: {
    fallbackLink:
      'If the button doesn’t work, copy this link into your browser:'
  }
} as const satisfies Record<Locale, Record<string, string>>

type BoldTextProps = {
  text: string
}

export const BoldText = ({ text }: BoldTextProps) => {
  const parts = text.split('**')

  return (
    <>
      {parts.map((part, index) => {
        return index % 2 === 1 ? <b key={`bold-${part}`}>{part}</b> : part
      })}
    </>
  )
}

type EmailParagraphProps = {
  children: React.ReactNode
}

export const EmailParagraph = ({ children }: EmailParagraphProps) => {
  return (
    <Text className="m-0 mb-4 text-sm leading-6 text-brand">{children}</Text>
  )
}

type EmailNoteProps = {
  children: React.ReactNode
}

export const EmailNote = ({ children }: EmailNoteProps) => {
  return (
    <Text className="m-0 mt-6 text-xs leading-5 text-brand-muted-dark">
      {children}
    </Text>
  )
}

const CALLOUT_CLASSES = {
  neutral: {
    box: 'border-brand-border bg-neutral-50',
    text: 'text-brand'
  },
  danger: {
    box: 'border-brand-danger-border bg-brand-danger-bg',
    text: 'text-brand-danger'
  }
} as const satisfies Record<string, Record<'box' | 'text', string>>

type EmailCalloutProps = {
  tone: keyof typeof CALLOUT_CLASSES
  children: React.ReactNode
}

export const EmailCallout = ({ tone, children }: EmailCalloutProps) => {
  const classes = CALLOUT_CLASSES[tone]

  return (
    <Section
      className={`my-6 rounded-md border border-solid px-4 py-3 ${classes.box}`}
    >
      <Text className={`m-0 text-sm leading-6 ${classes.text}`}>
        {children}
      </Text>
    </Section>
  )
}

type EmailButtonProps = {
  href: string
  children: React.ReactNode
}

export const EmailButton = ({ href, children }: EmailButtonProps) => {
  return (
    <Section className="my-8 text-center">
      <Button
        href={href}
        className="box-border inline-block rounded-md bg-brand-button px-6 py-3 text-center text-sm font-semibold text-brand-button-foreground no-underline"
      >
        {children}
      </Button>
    </Section>
  )
}

type EmailFallbackLinkProps = {
  href: string
  locale: Locale
}

export const EmailFallbackLink = ({ href, locale }: EmailFallbackLinkProps) => {
  return (
    <>
      <Text className="m-0 text-xs leading-5 text-brand-muted-dark">
        {blockTranslations[locale].fallbackLink}
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
            <Link href={href} className="text-brand-muted-dark underline">
              {href}
            </Link>
          </Text>
        </Column>
      </Row>
    </>
  )
}

export type EmailDetail = {
  label: string
  value: string
}

type EmailDetailsProps = {
  details: readonly EmailDetail[]
}

export const EmailDetails = ({ details }: EmailDetailsProps) => {
  return (
    <Section className="my-6 border-0 border-b border-solid border-brand-border">
      {details.map(({ label, value }) => {
        return (
          <Row
            key={label}
            className="border-0 border-t border-solid border-brand-border"
          >
            <Column className="py-3 pr-4 align-top text-sm leading-5 text-brand-muted-dark">
              {label}
            </Column>
            <Column
              className="py-3 text-right align-top text-sm leading-5 font-semibold text-brand"
              style={TABULAR_STYLE}
            >
              {value}
            </Column>
          </Row>
        )
      })}
    </Section>
  )
}

type EmailSectionProps = {
  title: string
  children: React.ReactNode
  caption?: string
}

export const EmailSection = ({
  title,
  caption,
  children
}: EmailSectionProps) => {
  return (
    <Section className="mt-10">
      <Section className="border-0 border-b border-solid border-brand-border pb-3">
        <Text className="m-0 text-base leading-6 font-semibold text-brand">
          {title}
        </Text>
        {caption === undefined ? null : (
          <Text className="m-0 mt-1 text-xs leading-5 text-brand-muted-dark">
            {caption}
          </Text>
        )}
      </Section>
      {children}
    </Section>
  )
}

type EmailSectionItemProps = {
  children: React.ReactNode
}

export const EmailSectionItem = ({ children }: EmailSectionItemProps) => {
  return (
    <Section className="border-0 border-b border-solid border-brand-border py-4">
      {children}
    </Section>
  )
}
