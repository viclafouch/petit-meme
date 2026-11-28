import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { AiSearchPage } from '~/routes/_public__root/_default/memes/-components/ai-search-page'

export const Route = createFileRoute('/_public__root/_default/memes/ai-search')(
  {
    component: AiSearchPage,
    loader: () => {
      return {
        jsonLd: getBreadcrumbJsonLd([
          { name: m.ai_search_seo_title(), pathname: '/memes/ai-search' }
        ])
      }
    },
    scripts: renderJsonLdScripts,
    head: () => {
      const locale = getLocale()

      return buildSeo({
        title: m.ai_search_seo_title(),
        pathname: '/memes/ai-search',
        description: m.ai_search_seo_description(),
        keywords: m.ai_search_seo_keywords(),
        image: buildOgImage(
          {
            type: 'ai-search',
            subtitle: m.ai_search_seo_description(),
            locale
          },
          m.ai_search_seo_title()
        )
      })
    }
  }
)
