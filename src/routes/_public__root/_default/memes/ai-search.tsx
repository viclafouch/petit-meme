import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import { AiSearchPage } from '~/routes/_public__root/_default/memes/-components/ai-search-page'

export const Route = createFileRoute('/_public__root/_default/memes/ai-search')(
  {
    component: AiSearchPage,
    head: () => {
      const locale = getLocale()

      return buildSeo({
        title: m.ai_search_seo_title(),
        pathname: '/memes/ai-search',
        description: m.ai_search_seo_description(),
        keywords: m.ai_search_seo_keywords(),
        image: buildOgImageUrl({
          type: 'ai-search',
          subtitle: m.ai_search_seo_description(),
          locale
        }),
        imageAlt: m.ai_search_seo_title()
      })
    }
  }
)
