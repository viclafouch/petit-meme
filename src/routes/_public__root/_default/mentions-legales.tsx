import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { MentionsLegalesPage } from './-components/legal-pages'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('~/server/legal/fr/mentions-legales.md?raw')
  },
  en: () => {
    return import('~/server/legal/en/mentions-legales.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  const module = await MARKDOWN_LOADERS[getLocale()]()

  return module.default
})

export const Route = createFileRoute(
  '/_public__root/_default/mentions-legales'
)({
  component: MentionsLegalesPage,
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_mentions_title()

    return buildSeo({
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
