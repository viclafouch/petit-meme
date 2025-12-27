import React from 'react'
import { formatDate } from 'date-fns'
import Hls from 'hls.js'
import {
  ArrowLeft,
  Clapperboard,
  Clipboard,
  Download,
  Pencil,
  Share2,
  Shuffle
} from 'lucide-react'
import { toast } from 'sonner'
import { StudioDialog } from '@/components/Meme/studio-dialog'
import ToggleLikeButton from '@/components/Meme/toggle-like-button'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  VideoFullScreenButton,
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange
} from '@/components/ui/kibo-ui/video-player'
import { OverlaySpinner } from '@/components/ui/overlay-spinner'
import { useDownloadMeme } from '@/hooks/use-download-meme'
import { useRegisterMemeView } from '@/hooks/use-register-meme-view'
import { useShareMeme } from '@/hooks/use-share-meme'
import {
  buildVideoImageUrl,
  buildVideoOriginalUrl,
  buildVideoStreamUrl
} from '@/lib/bunny'
import { getMemeByIdQueryOpts } from '@/lib/queries'
import { matchIsUserAdmin } from '@/lib/role'
import { buildMemeJsonLd, buildMemeSeo, buildUrl } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { getRandomMeme } from '@/server/meme'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ClientOnly,
  createFileRoute,
  Link,
  notFound,
  useLinkProps,
  useRouteContext,
  useRouter
} from '@tanstack/react-router'

const RouteComponent = () => {
  const { nextRandomMeme, originalUrl } = Route.useLoaderData()
  const { user } = useRouteContext({ from: '__root__' })
  const hls = React.useRef<Hls>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const { memeId } = Route.useParams()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const memeQuery = useSuspenseQuery(getMemeByIdQueryOpts(memeId))
  const meme = memeQuery.data
  const [isStudioDialogOpened, setIsStudioDialogOpened] = React.useState(false)
  const memeLink = useLinkProps({
    to: '/memes/$memeId',
    params: { memeId: meme.id }
  })

  useRegisterMemeView({
    memeId: meme.id,
    videoRef,
    ratio: 0.3,
    minMs: 2500,
    maxMs: 12000
  })

  const copyMemeLink = async () => {
    const text = buildUrl(memeLink.href as string)

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Lien copié', {
        position: 'bottom-center'
      })
    } catch (error) {
      toast.error('Impossible de copier le lien')
    }
  }

  const shareMutation = useShareMeme()
  const downloadMutation = useDownloadMeme()

  const allTags = React.useMemo(() => {
    return [
      ...new Set([
        ...meme.categories.flatMap((category) => {
          return [category.category.title, ...category.category.keywords]
        }),
        ...meme.keywords
      ])
    ]
  }, [meme])

  React.useEffect(() => {
    async function preload() {
      try {
        const nextMeme = await nextRandomMeme

        if (nextMeme) {
          await router.preloadRoute({
            to: '/memes/$memeId',
            params: {
              memeId: nextMeme.id
            }
          })
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed to preload route')
      }
    }

    preload()
  }, [router, nextRandomMeme])

  React.useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return () => {}
    }

    const videoSrc = buildVideoStreamUrl(meme.video.bunnyId)

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc
    } else if (Hls.isSupported()) {
      hls.current = new Hls()
      hls.current.loadSource(videoSrc)
      hls.current.attachMedia(video)
    }

    return () => {
      hls.current?.destroy()
    }
  }, [meme.id])

  const goToNextRandomMeme = async () => {
    try {
      videoRef.current?.pause()
      const newMeme = await nextRandomMeme

      if (newMeme) {
        navigate({ to: '/memes/$memeId', params: { memeId: newMeme.id } })
      } else {
        navigate({ to: '/memes' })
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-y-2 md:gap-y-4 items-start">
        <Link
          to="/memes"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="size-5" />
          <span>Retour aux memes</span>
        </Link>
        <div className="w-full grid md:grid-cols-[auto_300px] gap-x-2.5 gap-y-4">
          <div className="w-full flex flex-col gap-y-2 md:gap-y-2 items-center md:items-start">
            <div className="aspect-video w-full flex relative isolate border rounded-lg border-input overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-muted/50">
                <img
                  src={buildVideoImageUrl(meme.video.bunnyId)}
                  className="blur-2xl w-full h-full opacity-40 object-cover"
                  alt={meme.title}
                  loading="eager"
                />
              </div>
              <VideoPlayer className="overflow-hidden w-full h-full max-h-full dark">
                <VideoPlayerContent
                  crossOrigin=""
                  poster={buildVideoImageUrl(meme.video.bunnyId)}
                  className="w-full h-full"
                  playsInline
                  autoPlay
                  enableFullscreenOnDoubleClick
                  disablePictureInPicture
                  disableRemotePlayback
                  preload="auto"
                  slot="media"
                  src={originalUrl}
                  tabIndex={-1}
                  ref={videoRef}
                />
                <VideoPlayerControlBar>
                  <VideoPlayerPlayButton />
                  <VideoPlayerTimeRange />
                  <VideoPlayerTimeDisplay showDuration />
                  <VideoPlayerMuteButton />
                  <VideoPlayerVolumeRange />
                  <VideoFullScreenButton />
                </VideoPlayerControlBar>
              </VideoPlayer>
            </div>
            <div className="flex justify-center md:justify-start gap-x-2 items-center">
              <h1 className="font-bricolage text-foreground max-w-4xl text-left font-semibold md:text-balance text-lg leading-[1.2] sm:text-xl lg:text-2xl">
                {meme.title}
              </h1>
              <div className="flex">
                <ToggleLikeButton size="iconLg" meme={meme} />
                {user && matchIsUserAdmin(user) ? (
                  <Link
                    className={buttonVariants({
                      size: 'iconLg',
                      variant: 'ghost'
                    })}
                    to="/admin/library/$memeId"
                    params={{ memeId: meme.id }}
                  >
                    <Pencil />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-y-4 max-w-md md:max-w-none mx-auto items-center md:items-start">
            <div className="flex flex-col gap-y-2.5 w-full">
              <Button
                variant="default"
                onClick={(event) => {
                  event.preventDefault()
                  videoRef.current?.pause()

                  setIsStudioDialogOpened(true)
                }}
              >
                <Clapperboard />
                Ouvrir dans Studio
              </Button>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={shareMutation.isPending}
                  variant="outline"
                  className="md:hidden shrink-0 flex-1"
                  onClick={() => {
                    return shareMutation.mutate(meme)
                  }}
                >
                  <Share2 />
                  Partager la vidéo
                </Button>
                <Button
                  disabled={downloadMutation.isPending}
                  variant="outline"
                  className="flex-1 shrink-0"
                  onClick={() => {
                    return downloadMutation.mutate(meme)
                  }}
                >
                  <Download />
                  Télécharger la vidéo
                </Button>
              </div>
              <Button
                variant="outline"
                className="shrink-0 flex-1"
                onClick={() => {
                  return copyMemeLink()
                }}
              >
                <Clipboard />
                Copier le lien
              </Button>
              <Button variant="outline" onClick={goToNextRandomMeme}>
                <Shuffle />
                Aléatoire
              </Button>
            </div>
            {allTags.length > 0 ? (
              <div className="w-full flex justify-center md:justify-start flex-wrap gap-1.5 max-w-125 mx-auto">
                {allTags.map((tag) => {
                  return (
                    <Badge variant="secondary" key={tag}>
                      {tag.toLowerCase()}
                    </Badge>
                  )
                })}
              </div>
            ) : null}
            <div className="flex flex-col gap-y-1 text-center md:text-left">
              {meme.description ? (
                <>
                  <p className="text-muted-foreground text-xs">
                    {meme.description}
                  </p>
                  <hr className="my-2" />
                </>
              ) : null}
              {meme.publishedAt ? (
                <span className="text-muted-foreground text-xs">
                  Ajouté le {formatDate(meme.publishedAt, 'dd/MM/yyyy')}
                </span>
              ) : null}
              <span className="text-muted-foreground text-xs">
                {meme.viewCount} vues
              </span>
            </div>
          </div>
        </div>
      </div>
      <ClientOnly>
        {isStudioDialogOpened ? (
          <React.Suspense fallback={<OverlaySpinner />}>
            <StudioDialog
              meme={meme}
              open
              onOpenChange={setIsStudioDialogOpened}
            />
          </React.Suspense>
        ) : null}
      </ClientOnly>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/memes/$memeId')({
  component: RouteComponent,
  pendingMs: 1000,
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.ensureQueryData(
      getMemeByIdQueryOpts(params.memeId)
    )

    const originalUrl = buildVideoOriginalUrl(meme.video.bunnyId)

    if (meme.status !== 'PUBLISHED') {
      throw notFound()
    }

    const nextRandomMeme = getRandomMeme({ data: meme.id })

    return {
      meme,
      originalUrl,
      nextRandomMeme
    }
  },
  scripts: ({ loaderData }) => {
    if (loaderData) {
      return [
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            buildMemeJsonLd(loaderData.meme, loaderData.originalUrl)
          )
        }
      ]
    }

    return []
  },
  head: ({ loaderData, match }) => {
    if (loaderData?.meme) {
      return {
        meta: [...buildMemeSeo(loaderData.meme, { pathname: match.pathname })],
        links: [
          {
            rel: 'canonical',
            href: buildUrl(match.pathname)
          }
        ]
      }
    }

    return {}
  }
})
