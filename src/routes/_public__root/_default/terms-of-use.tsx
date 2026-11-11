import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { TermsOfUsePage } from './-components/legal-pages'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('~/server/legal/fr/terms-of-use.md?raw')
  },
  en: () => {
    return import('~/server/legal/en/terms-of-use.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  const module = await MARKDOWN_LOADERS[getLocale()]()

  return module.default
})

export const Route = createFileRoute('/_public__root/_default/terms-of-use')({
  component: TermsOfUsePage,
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_terms_title()

    return buildSeo({
      title,
      pathname: '/terms-of-use',
      description: m.legal_terms_description(),
      image: buildOgImageUrl({
        type: 'legal',
        title,
        subtitle: m.legal_terms_description(),
        locale
      }),
      imageAlt: title
    })
  }
})
