import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildFaqJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getFaqItems } from './-components/faq-items'
import { FaqPage } from './-components/faq-page'

const loadFaqItems = createServerFn({ method: 'GET' }).handler(() => {
  return getFaqItems()
})

export const Route = createFileRoute('/_public__root/_default/faq/')({
  component: FaqPage,
  staleTime: Infinity,
  preloadStaleTime: Infinity,
  loader: () => {
    return loadFaqItems()
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
