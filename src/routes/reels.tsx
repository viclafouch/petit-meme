import React from 'react'
import { DefaultLoading } from '@/components/default-loading'
import { MemeReels } from '@/components/Meme/meme-reels'
import { getInfiniteReelsQueryOpts } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div className="bg-primary-foreground dark">
      <MemeReels />
    </div>
  )
}

export const Route = createFileRoute('/reels')({
  component: RouteComponent,
  ssr: 'data-only',
  pendingComponent: () => {
    return <DefaultLoading className="bg-primary-foreground dark h-screen" />
  },
  head: () => {
    return {
      meta: [
        ...seo({
          title: 'Mode reels',
          description:
            'Découvre la plus grande bibliothèque de mèmes : crée, explore et partage des mèmes légendaires sur Petit Meme. Gratuit et accessible à tous !'
        })
      ]
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(
      getInfiniteReelsQueryOpts()
    )
  }
})
