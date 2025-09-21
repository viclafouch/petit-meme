import React from 'react'
import {
  getBestMemesQueryOpts,
  getFavoritesMemesQueryOpts,
  getRecentCountMemesQueryOpts
} from '@/lib/queries'
import { Faq } from '@/routes/_public__root/-components/faq'
import { createFileRoute } from '@tanstack/react-router'
import { Demo } from './-components/demo'
import { Hero } from './-components/hero'
import { PageContainer } from './-components/page-headers'

const RouteComponent = () => {
  const { bestMemesPromise } = Route.useLoaderData()

  return (
    <PageContainer>
      <section className="flex w-full flex-col gap-16 py-30 pb-10 sm:pt-42">
        <Hero />
        <React.Suspense fallback={<div />}>
          <Demo bestMemesPromise={bestMemesPromise} />
        </React.Suspense>
        <Faq />
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
