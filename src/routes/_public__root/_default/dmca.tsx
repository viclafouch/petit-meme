import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { DmcaPage } from './-components/legal-pages'

const MARKDOWN_LOADERS = {
  fr: () => {
    return import('~/server/legal/fr/dmca.md?raw')
  },
  en: () => {
    return import('~/server/legal/en/dmca.md?raw')
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
  loader: async () => {
    return {
      markdown: await loadMarkdown(),
      jsonLd: getBreadcrumbJsonLd([
        { name: m.legal_dmca_title(), pathname: '/dmca' }
      ])
    }
  },
  scripts: renderJsonLdScripts,
  head: () => {
    const locale = getLocale()
    const title = m.legal_dmca_title()

    return buildSeo({
      title,
      pathname: '/dmca',
      description: m.legal_dmca_description(),
      image: buildOgImage(
        {
          type: 'legal',
          title,
          subtitle: m.legal_dmca_description(),
          locale
        },
        title
      )
    })
  }
})
