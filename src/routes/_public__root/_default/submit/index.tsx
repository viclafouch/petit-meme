import { createFileRoute } from '@tanstack/react-router'
import { buildBreadcrumbJsonLd } from '~/lib/seo/json-ld'
import { buildSeo } from '~/lib/seo/meta'
import { buildOgImageUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listUserProposalsQueryOpts } from '~/queries/proposal'
import { SubmitPage } from './-components/submit-page'

export const Route = createFileRoute('/_public__root/_default/submit/')({
  component: SubmitPage,
  loader: async ({ context }) => {
    if (context.user) {
      await context.queryClient.query({
        ...listUserProposalsQueryOpts(),
        staleTime: 'static'
      })
    }
  },
  head: () => {
    const locale = getLocale()

    return {
      ...buildSeo({
        title: m.submit_heading(),
        pathname: '/submit',
        description: m.submit_description(),
        keywords: m.seo_submit_keywords(),
        image: buildOgImageUrl({
          type: 'submit',
          subtitle: m.submit_description(),
          locale
        }),
        imageAlt: m.submit_heading()
      }),
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: m.meme_breadcrumb_home(), pathname: '/' },
              { name: m.submit_heading(), pathname: '/submit' }
            ])
          )
        }
      ]
    }
  }
})
