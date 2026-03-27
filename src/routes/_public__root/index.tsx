import { createFileRoute } from '@tanstack/react-router'
import { MINUTE } from '~/constants/time'
import {
  getFavoritesMemesQueryOpts,
  getRecentCountMemesQueryOpts,
  getTrendingMemesQueryOpts
} from '~/lib/queries'
import { buildHomeJsonLd, seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import { Faq, getHomeFaqItems } from '~/routes/_public__root/-components/faq'
import { Responsive } from '~/routes/_public__root/-components/responsive'
import { BestMemes } from './-components/best-memes'
import { Hero } from './-components/hero'
import { PageContainer } from './-components/page-headers'

const RouteComponent = () => {
  return (
    <PageContainer>
      <section className="flex w-full flex-col py-30 pb-10 sm:pt-42">
        <Hero />
        <div className="container lg:mt-36 mt-24">
          <BestMemes />
          <div className="mt-16">
            <Responsive />
          </div>
          <div className="mt-16 lg:mt-40">
            <Faq />
          </div>
        </div>
      </section>
    </PageContainer>
  )
}

export const Route = createFileRoute('/_public__root/')({
  component: RouteComponent,
  pendingMs: 3000,
  staleTime: 10 * MINUTE,
  head: () => {
    return seo({
      title: m.seo_home_title(),
      keywords: m.seo_home_keywords(),
      description: m.seo_home_description()
    })
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(
          buildHomeJsonLd({ faqItems: getHomeFaqItems() })
        )
      }
    ]
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getTrendingMemesQueryOpts()),
      context.queryClient.ensureQueryData(getRecentCountMemesQueryOpts()),
      context.user
        ? context.queryClient.ensureQueryData(getFavoritesMemesQueryOpts())
        : undefined
    ])
  }
})
