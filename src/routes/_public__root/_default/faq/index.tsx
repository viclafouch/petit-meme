import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale, locales } from '~/paraglide/runtime'
import { FaqPage } from './-components/faq-page'
import { getFaqItems } from './-lib/faq-items'

const listFaqItems = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return z.object({ locale: z.enum(locales) }).parse(data)
  })
  .handler(({ data }) => {
    return getFaqItems(data.locale)
  })

export const Route = createFileRoute('/_public__root/_default/faq/')({
  component: FaqPage,
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  loaderDeps: () => {
    return { locale: getLocale() }
  },
  loader: async ({ deps }) => {
    return {
      faqItems: await listFaqItems({ data: { locale: deps.locale } }),
      jsonLd: getBreadcrumbJsonLd([{ name: m.faq_title(), pathname: '/faq' }])
    }
  },
  scripts: renderJsonLdScripts,
  head: () => {
    return buildSeo({
      title: m.seo_faq_title(),
      pathname: '/faq',
      description: m.seo_faq_description(),
      image: buildOgImage(
        {
          type: 'faq',
          subtitle: m.seo_faq_description(),
          locale: getLocale()
        },
        m.seo_faq_title()
      )
    })
  }
})
