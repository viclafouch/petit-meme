import { createFileRoute } from '@tanstack/react-router'
import { DefaultLoading } from '~/components/default-loading'
import { MemeReels } from '~/components/Meme/meme-reels'
import { getInfiniteReelsQueryOpts } from '~/lib/queries'
import { seo } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'

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
    return seo({
      title: m.seo_reels_title(),
      pathname: '/reels',
      description: m.meme_seo_library_description()
    })
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(
      getInfiniteReelsQueryOpts()
    )
  }
})
