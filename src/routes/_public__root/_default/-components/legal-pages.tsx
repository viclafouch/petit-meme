import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getRouteApi } from '@tanstack/react-router'
import { BASE_MARKDOWN_COMPONENTS } from '~/constants/markdown'

const dmcaRouteApi = getRouteApi('/_public__root/_default/dmca')
const privacyRouteApi = getRouteApi('/_public__root/_default/privacy')
const termsOfUseRouteApi = getRouteApi('/_public__root/_default/terms-of-use')
const mentionsLegalesRouteApi = getRouteApi(
  '/_public__root/_default/mentions-legales'
)

type GfmMarkdownProps = {
  markdown: string
}

const GfmMarkdown = ({ markdown }: GfmMarkdownProps) => {
  return (
    <div>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={BASE_MARKDOWN_COMPONENTS}
      >
        {markdown}
      </Markdown>
    </div>
  )
}

export const DmcaPage = () => {
  const markdown = dmcaRouteApi.useLoaderData()

  return (
    <div>
      <Markdown components={BASE_MARKDOWN_COMPONENTS}>{markdown}</Markdown>
    </div>
  )
}

export const PrivacyPage = () => {
  return <GfmMarkdown markdown={privacyRouteApi.useLoaderData()} />
}

export const TermsOfUsePage = () => {
  return <GfmMarkdown markdown={termsOfUseRouteApi.useLoaderData()} />
}

export const MentionsLegalesPage = () => {
  return <GfmMarkdown markdown={mentionsLegalesRouteApi.useLoaderData()} />
}
