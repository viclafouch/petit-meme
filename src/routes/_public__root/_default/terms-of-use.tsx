import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildOgImageUrl, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { TermsOfUsePage } from './-components/legal-pages'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('../../../../md/fr/terms-of-use.md?raw')
  },
  en: () => {
    return import('../../../../md/en/terms-of-use.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  const module = await MARKDOWN_LOADERS[getLocale()]()

  return module.default
})

export const Route = createFileRoute('/_public__root/_default/terms-of-use')({
  component: TermsOfUsePage,
  staleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_terms_title()

    return seo({
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
