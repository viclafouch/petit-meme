import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildFaqJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
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
  loader: ({ deps }) => {
    return listFaqItems({ data: { locale: deps.locale } })
  },
  scripts: ({ loaderData }) => {
    if (!loaderData) {
      return []
    }

    return [
      {
        type: 'application/ld+json',
        children: serializeJsonLd(buildFaqJsonLd({ faqItems: loaderData }))
      }
    ]
  },
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
