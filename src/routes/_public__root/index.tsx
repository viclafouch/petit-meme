import React from 'react'
import {
  getBestMemesQueryOpts,
  getFavoritesMemesQueryOpts,
  getRecentCountMemesQueryOpts
} from '@/lib/queries'
import { buildHomeJsonLd, seo } from '@/lib/seo'
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
  head: () => {
    return {
      meta: [
        ...seo({
          title: 'Ta banque de mèmes vidéo, prête à faire rire Internet',
          keywords: ['banque', 'memes', 'gratuit', 'francais'].join(','),
          description:
            'Découvre Petit Meme, la plateforme où tu peux parcourir, créer et partager des mèmes gratuitement. Explore notre bibliothèque de vidéos et images humoristiques, sauvegarde tes favoris et amuse-toi avec des contenus toujours à jour.'
        })
      ]
    }
  },
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(buildHomeJsonLd())
      }
    ]
  },
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
