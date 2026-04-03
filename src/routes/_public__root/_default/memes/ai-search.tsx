import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { AiSearchPage } from '~/routes/_public__root/_default/memes/-components/ai-search-page'

export const Route = createFileRoute('/_public__root/_default/memes/ai-search')(
  {
    component: AiSearchPage,
    head: () => {
      return seo({
        title: m.ai_search_seo_title(),
        pathname: '/memes/ai-search',
        description: m.ai_search_seo_description(),
        keywords: m.ai_search_seo_keywords()
      })
    }
  }
)
