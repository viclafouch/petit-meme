import { createFileRoute } from '@tanstack/react-router'
import {
  buildBreadcrumbJsonLd,
  buildWebApplicationJsonLd
} from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { AppPage } from './-components/app-page'
import appPageCss from './-components/app-page.css?url'

export const Route = createFileRoute('/_public__root/_default/app/')({
  component: AppPage,
  head: () => {
    const locale = getLocale()

    const seo = buildSeo({
      title: m.app_page_title(),
      pathname: '/app',
      description: m.app_page_description(),
      keywords: m.seo_app_keywords(),
      image: buildOgImageUrl({
        type: 'app',
        subtitle: m.app_page_description(),
        locale
      }),
      imageAlt: m.app_page_title()
    })

    return {
      ...seo,
      links: [...seo.links, { rel: 'stylesheet', href: appPageCss }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(buildWebApplicationJsonLd())
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: m.meme_breadcrumb_home(), pathname: '/' },
              { name: m.app_page_title(), pathname: '/app' }
            ])
          )
        }
      ]
    }
  }
})
