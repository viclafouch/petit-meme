import Markdown from 'react-markdown'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { BASE_MARKDOWN_COMPONENTS } from '~/constants/markdown'
import { buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('../../../../md/fr/dmca.md?raw')
  },
  en: () => {
    return import('../../../../md/en/dmca.md?raw')
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

export const Route = createFileRoute('/_public__root/_default/dmca')({
  component: RouteComponent,
  staleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_dmca_title()

    return seo({
      title,
      pathname: '/dmca',
      description: m.legal_dmca_description(),
      image: buildOgImageUrl({
        type: 'legal',
        title,
        subtitle: m.legal_dmca_description(),
        locale
      }),
      imageAlt: title
    })
  }
})
