import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { BASE_MARKDOWN_COMPONENTS } from '~/constants/markdown'
import { buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('../../../../md/fr/mentions-legales.md?raw')
  },
  en: () => {
    return import('../../../../md/en/mentions-legales.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  return (await MARKDOWN_LOADERS[getLocale()]()).default
})

const RouteComponent = () => {
  const md = Route.useLoaderData()

  return (
    <div>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={BASE_MARKDOWN_COMPONENTS}
      >
        {md}
      </Markdown>
    </div>
  )
}

export const Route = createFileRoute(
  '/_public__root/_default/mentions-legales'
)({
  component: RouteComponent,
  staleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_mentions_title()

    return seo({
      title,
      pathname: '/mentions-legales',
      description: m.legal_mentions_description(),
      image: buildOgImageUrl({
        type: 'legal',
        title,
        subtitle: m.legal_mentions_description(),
        locale
      }),
      imageAlt: title
    })
  }
})
