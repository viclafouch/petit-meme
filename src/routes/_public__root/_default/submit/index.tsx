import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '~/lib/seo/meta'
import {
  getBreadcrumbJsonLd,
  renderJsonLdScripts
} from '~/lib/seo/page-json-ld'
import { buildOgImage } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listUserProposalsQueryOpts } from '~/queries/proposal'
import { SubmitPage } from './-components/submit-page'
import { SUBMIT_SEARCH_SCHEMA } from './-lib/submit-search'

export const Route = createFileRoute('/_public__root/_default/submit/')({
  component: SubmitPage,
  validateSearch: (search) => {
    return SUBMIT_SEARCH_SCHEMA.parse(search)
  },
  loader: async ({ context }) => {
    if (context.user) {
      await context.queryClient.query({
        ...listUserProposalsQueryOpts(),
        staleTime: 'static'
      })
    }

    return {
      jsonLd: getBreadcrumbJsonLd([
        { name: m.submit_heading(), pathname: '/submit' }
      ])
    }
  },
  scripts: renderJsonLdScripts,
  head: () => {
    const locale = getLocale()

    return {
      ...buildSeo({
        title: m.submit_heading(),
        pathname: '/submit',
        description: m.submit_description(),
        keywords: m.seo_submit_keywords(),
        image: buildOgImage(
          {
            type: 'submit',
            subtitle: m.submit_description(),
            locale
          },
          m.submit_heading()
        )
      })
    }
  }
})
