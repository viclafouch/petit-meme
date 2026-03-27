import Markdown from 'react-markdown'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { BASE_MARKDOWN_COMPONENTS } from '~/constants/markdown'
import { seo } from '~/lib/seo'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('../../../../md/fr/terms-of-use.md?raw')
  },
  en: () => {
    return import('../../../../md/en/terms-of-use.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  return (await MARKDOWN_LOADERS[getLocale()]()).default
})

const RouteComponent = () => {
  const md = Route.useLoaderData()

  return (
    <div>
      <Markdown components={BASE_MARKDOWN_COMPONENTS}>{md}</Markdown>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/terms-of-use')({
  component: RouteComponent,
  staleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    return seo({
      title: m.legal_terms_title(),
      pathname: '/terms-of-use',
      description: m.legal_terms_description()
    })
  }
})
