import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BASE_MARKDOWN_COMPONENTS } from '@/constants/markdown'
import { seo } from '@/lib/seo'
import { m } from '@/paraglide/messages'
import type { Locale } from '@/paraglide/runtime'
import { getLocale } from '@/paraglide/runtime'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  const modules = {
    fr: (await import('~/md/fr/mentions-legales.md?raw')).default,
    en: (await import('~/md/en/mentions-legales.md?raw')).default
  } satisfies Record<Locale, string>

  return modules[getLocale()]
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
    return seo({
      title: m.legal_mentions_title(),
      pathname: '/mentions-legales',
      description: m.legal_mentions_description()
    })
  }
})
