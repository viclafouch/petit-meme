import React from 'react'
import { parseMarkdown } from '@tanstack/markdown/parser'
import { Markdown } from '@tanstack/markdown/react'
import { getRouteApi } from '@tanstack/react-router'
import { BASE_MARKDOWN_COMPONENTS } from '~/routes/_public__root/_default/-components/markdown-components'

const dmcaRouteApi = getRouteApi('/_public__root/_default/dmca')
const privacyRouteApi = getRouteApi('/_public__root/_default/privacy')
const termsOfUseRouteApi = getRouteApi('/_public__root/_default/terms-of-use')
const mentionsLegalesRouteApi = getRouteApi(
  '/_public__root/_default/mentions-legales'
)

type LegalMarkdownProps = {
  markdown: string
}

const LegalMarkdown = ({ markdown }: LegalMarkdownProps) => {
  const document = React.useMemo(() => {
    return parseMarkdown(markdown)
  }, [markdown])

  return (
    <article className="[font-size-adjust:from-font]">
      <Markdown components={BASE_MARKDOWN_COMPONENTS}>{document}</Markdown>
    </article>
  )
}

const selectMarkdown = (data: { markdown: string }) => {
  return data.markdown
}

export const DmcaPage = () => {
  return (
    <LegalMarkdown
      markdown={dmcaRouteApi.useLoaderData({ select: selectMarkdown })}
    />
  )
}

export const PrivacyPage = () => {
  return (
    <LegalMarkdown
      markdown={privacyRouteApi.useLoaderData({ select: selectMarkdown })}
    />
  )
}

export const TermsOfUsePage = () => {
  return (
    <LegalMarkdown
      markdown={termsOfUseRouteApi.useLoaderData({ select: selectMarkdown })}
    />
  )
}

export const MentionsLegalesPage = () => {
  return (
    <LegalMarkdown
      markdown={mentionsLegalesRouteApi.useLoaderData({
        select: selectMarkdown
      })}
    />
  )
}
