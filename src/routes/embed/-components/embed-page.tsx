import { getRouteApi, Link } from '@tanstack/react-router'
import { MemePlayer } from '~/components/meme/meme-player'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { LOGO_PATH } from '~/constants/branding'
import { m } from '~/paraglide/messages'

const embedRouteApi = getRouteApi('/embed/$memeId')

export const EmbedPage = () => {
  const { meme } = embedRouteApi.useLoaderData()
  const { videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: meme.id
  })

  return (
    <main className="dark relative h-dvh w-full overflow-hidden bg-black">
      <MemePlayer
        bunnyId={meme.video.bunnyId}
        title={meme.title}
        preload="metadata"
        onVideoChange={videoCallbackRef}
        playbackFailure={playbackFailure}
        className="block h-dvh w-full"
      />
      <Link
        to="/memes/$memeId"
        params={{ memeId: meme.id }}
        target="_blank"
        rel="noopener"
        className="font-bricolage absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-black/60 py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <img src={LOGO_PATH} alt="" className="size-6 rounded-full" />
        {m.embed_watch_on_site()}
      </Link>
    </main>
  )
}
