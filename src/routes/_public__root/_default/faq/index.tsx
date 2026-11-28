import { createFileRoute } from '@tanstack/react-router'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildFaqJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getFaqItems } from './-components/faq-items'
import { FaqPage } from './-components/faq-page'

export const Route = createFileRoute('/_public__root/_default/faq/')({
  component: FaqPage,
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: serializeJsonLd(buildFaqJsonLd({ faqItems: getFaqItems() }))
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
