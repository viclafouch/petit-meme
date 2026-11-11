import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { DmcaPage } from './-components/legal-pages'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('../../../../md/fr/dmca.md?raw')
  },
  en: () => {
    return import('../../../../md/en/dmca.md?raw')
  }
} satisfies Record<Locale, () => Promise<{ default: string }>>

const loadMarkdown = createServerFn({ method: 'GET' }).handler(async () => {
  const module = await MARKDOWN_LOADERS[getLocale()]()

  return module.default
})

export const Route = createFileRoute('/_public__root/_default/dmca')({
  component: DmcaPage,
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  loader: () => {
    return loadMarkdown()
  },
  head: () => {
    const locale = getLocale()
    const title = m.legal_dmca_title()

    return buildSeo({
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
