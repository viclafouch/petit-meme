import { getRouteApi, Link } from '@tanstack/react-router'
import { MemeVideoPlayer } from '~/components/meme/meme-video-player'
import { LOGO_PATH } from '~/constants/branding'
import { useMemeHls } from '~/hooks/use-meme-hls'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages.js'

const embedRouteApi = getRouteApi('/embed/$memeId')

export const EmbedPage = () => {
  const { meme } = embedRouteApi.useLoaderData()
  const { videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: meme.id
  })

  return (
    <main className="dark relative h-dvh w-full overflow-hidden bg-black">
      <MemeVideoPlayer
        ref={videoCallbackRef}
        poster={buildVideoImageUrl(meme.video.bunnyId)}
        playbackFailure={playbackFailure}
        preload="metadata"
        aria-label={meme.title}
        className="h-dvh rounded-none"
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
