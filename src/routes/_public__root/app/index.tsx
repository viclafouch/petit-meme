import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { AppPage } from './-components/app-page'
import appPageCss from './-components/app-page.css?url'

export const Route = createFileRoute('/_public__root/app/')({
  component: AppPage,
  loader: () => {
    return {
      jsonLd: getBreadcrumbJsonLd([
        { name: m.app_page_title(), pathname: '/app' }
      ])
    }
  },
  scripts: renderJsonLdScripts,
  head: () => {
    const locale = getLocale()

    const seo = buildSeo({
      title: m.app_page_title(),
      pathname: '/app',
      description: m.app_page_description(),
      keywords: m.seo_app_keywords(),
      image: buildOgImage(
        {
          type: 'app',
          subtitle: m.app_page_description(),
          locale
        },
        m.app_page_title()
      )
    })

    return {
      ...seo,
      links: [...seo.links, { rel: 'stylesheet', href: appPageCss }]
    }
  }
})
