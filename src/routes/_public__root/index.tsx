import React from 'react'
import {
  getBestMemesQueryOpts,
  getFavoritesMemesQueryOpts,
  getRecentCountMemesQueryOpts
} from '@/lib/queries'
import { Faq } from '@/routes/_public__root/-components/faq'
import { Responsive } from '@/routes/_public__root/-components/responsive'
import { createFileRoute } from '@tanstack/react-router'
import { BestMemes } from './-components/best-memes'
import { Hero } from './-components/hero'
import { PageContainer } from './-components/page-headers'

const RouteComponent = () => {
  const { bestMemesPromise } = Route.useLoaderData()

  return (
    <PageContainer>
      <section className="flex w-full flex-col py-30 pb-10 sm:pt-42">
        <Hero />
        <div className="container lg:mt-36 mt-24">
          <React.Suspense fallback={<div />}>
            <BestMemes bestMemesPromise={bestMemesPromise} />
          </React.Suspense>
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
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getRecentCountMemesQueryOpts())
    const bestMemesPromise = context.queryClient.ensureQueryData(
      getBestMemesQueryOpts()
    )

    if (context.user) {
      context.queryClient.fetchQuery(getFavoritesMemesQueryOpts())
    }

    return {
      bestMemesPromise
    }
  }
})
