/* eslint-disable unicorn/filename-case */
import React from 'react'
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
import { MemeLanguageBadge } from '@/components/Meme/meme-language-badge'
import { MemesList } from '@/components/Meme/memes-list'
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
import type { MemeFullData } from '@/constants/meme'
import { useMemeExport } from '@/hooks/use-meme-export'
import { useMemeHls } from '@/hooks/use-meme-hls'
import { useRegisterMemeView } from '@/hooks/use-register-meme-view'
import { buildVideoImageUrl, buildVideoOriginalUrl } from '@/lib/bunny'
import { getMemeByIdQueryOpts, getRelatedMemesQueryOpts } from '@/lib/queries'
import { matchIsUserAdmin } from '@/lib/role'
import {
  buildBreadcrumbJsonLd,
  buildMemeJsonLd,
  buildMemeSeo,
  buildUrl
} from '@/lib/seo'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime'
import { getRandomMeme, trackMemeAction } from '@/server/meme'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  useLinkProps,
  useRouteContext
} from '@tanstack/react-router'

type MemeInfoParams = {
  meme: Pick<
    MemeFullData,
    'description' | 'publishedAt' | 'viewCount' | 'contentLocale'
  >
  allTags: string[]
}

const MemeInfo = ({ meme, allTags }: MemeInfoParams) => {
  return (
    <>
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
            <p className="text-muted-foreground text-xs">{meme.description}</p>
            <hr className="my-2" />
          </>
        ) : null}
        {meme.contentLocale !== 'UNIVERSAL' ? (
          <MemeLanguageBadge contentLocale={meme.contentLocale} showLabel />
        ) : null}
        {meme.publishedAt ? (
          <span className="text-muted-foreground text-xs">
            {m.meme_added_on({
              date: new Date(meme.publishedAt).toLocaleDateString(getLocale())
            })}
          </span>
        ) : null}
        <span className="text-muted-foreground text-xs">
          {m.meme_views({ count: meme.viewCount })}
        </span>
      </div>
    </>
  )
}

type RelatedMemesParams = {
  memeId: string
  title: string
}

const RelatedMemes = ({ memeId, title }: RelatedMemesParams) => {
  const relatedMemesQuery = useQuery(
    getRelatedMemesQueryOpts({ memeId, title })
  )

  if (!relatedMemesQuery.data || relatedMemesQuery.data.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <h2 className="text-base font-medium mb-4">{m.meme_related()}</h2>
      <MemesList
        layoutContext="recommend"
        memes={relatedMemesQuery.data}
        columnGridCount={4}
      />
    </div>
  )
}

const RouteComponent = () => {
  const { originalUrl } = Route.useLoaderData()
  const { user } = useRouteContext({ from: '__root__' })
  const { memeId } = Route.useParams()
  const memeQuery = useSuspenseQuery(getMemeByIdQueryOpts(memeId))
  const meme = memeQuery.data
  const { videoRef } = useMemeHls({ bunnyId: meme.video.bunnyId })
  const navigate = Route.useNavigate()
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

  const handleCopyMemeLink = async () => {
    const text = buildUrl(memeLink.href as string)

    try {
      await navigator.clipboard.writeText(text)
      void trackMemeAction({ data: { memeId: meme.id, action: 'share' } })
      toast.success(m.meme_link_copied(), {
        position: 'bottom-center'
      })
    } catch {
      toast.error(m.meme_link_copy_error())
    }
  }

  const shareMutation = useMemeExport({ mode: 'share' })
  const downloadMutation = useMemeExport({ mode: 'download' })
  const randomMemeMutation = useMutation({
    mutationFn: () => {
      return getRandomMeme({ data: { exceptId: meme.id } })
    }
  })

  // eslint-disable-next-line no-restricted-syntax
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

  const handleNavigateToRandomMeme = () => {
    videoRef.current?.pause()
    randomMemeMutation.mutate(undefined, {
      onSuccess: (randomMeme) => {
        if (randomMeme) {
          void navigate({
            to: '/memes/$memeId',
            params: { memeId: randomMeme.id }
          })
        } else {
          void navigate({ to: '/memes' })
        }
      }
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-y-2 md:gap-y-4 items-start">
        <Link
          to="/memes"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="size-5" />
          <span>{m.meme_back_to_memes()}</span>
        </Link>
        <div className="w-full grid md:grid-cols-[auto_300px] gap-x-2.5 gap-y-4">
          <div className="w-full flex flex-col gap-y-2 md:gap-y-2 items-center md:items-start">
            <div className="aspect-video w-full flex relative isolate border rounded-lg border-input overflow-hidden">
              <div className="absolute top-0 left-0 size-full bg-muted/50">
                <img
                  src={buildVideoImageUrl(meme.video.bunnyId)}
                  className="blur-2xl size-full opacity-40 object-cover"
                  alt={meme.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <VideoPlayer className="overflow-hidden size-full max-h-full dark">
                <VideoPlayerContent
                  crossOrigin=""
                  poster={buildVideoImageUrl(meme.video.bunnyId)}
                  className="size-full"
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
                    aria-label={m.meme_edit_aria()}
                  >
                    <Pencil />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-y-4 max-w-md md:max-w-none mx-auto items-center md:items-start">
            <div className="flex flex-col gap-y-2.5 w-full">
              <Link
                to="/memes/$memeId/studio"
                params={{ memeId: meme.id }}
                className={cn(buttonVariants({ variant: 'default' }))}
              >
                <Clapperboard />
                {m.meme_open_studio()}
              </Link>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={shareMutation.isPending}
                  variant="outline"
                  className="md:hidden shrink-0 flex-1"
                  onClick={() => {
                    return shareMutation.trigger(meme)
                  }}
                >
                  <Share2 />
                  {m.meme_share_video()}
                </Button>
                <Button
                  disabled={downloadMutation.isPending}
                  variant="outline"
                  className="flex-1 shrink-0"
                  onClick={() => {
                    return downloadMutation.trigger(meme)
                  }}
                >
                  <Download />
                  {m.meme_download_video()}
                </Button>
              </div>
              <Button
                variant="outline"
                className="shrink-0 flex-1"
                onClick={handleCopyMemeLink}
              >
                <Clipboard />
                {m.meme_copy_link()}
              </Button>
              <Button
                variant="outline"
                disabled={randomMemeMutation.isPending}
                onClick={handleNavigateToRandomMeme}
              >
                <Shuffle />
                {m.meme_random()}
              </Button>
            </div>
            <MemeInfo meme={meme} allTags={allTags} />
          </div>
        </div>
      </div>
      <RelatedMemes memeId={meme.id} title={meme.title} />
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

    return {
      meme,
      originalUrl
    }
  },
  scripts: ({ loaderData }) => {
    if (loaderData) {
      const { meme } = loaderData
      const categoryName =
        meme.categories[0]?.category.title ?? m.meme_breadcrumb_fallback()
      const categorySlug = meme.categories[0]?.category.slug ?? 'all'

      return [
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            buildMemeJsonLd(meme, loaderData.originalUrl)
          )
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: m.meme_breadcrumb_home(), pathname: '/' },
              {
                name: categoryName,
                pathname: `/memes/category/${categorySlug}`
              },
              { name: meme.title, pathname: `/memes/${meme.id}` }
            ])
          )
        }
      ]
    }

    return []
  },
  head: ({ loaderData, match }) => {
    if (loaderData?.meme) {
      const seo = buildMemeSeo(loaderData.meme, { pathname: match.pathname })

      return {
        ...seo,
        links: [
          ...(seo.links ?? []),
          {
            rel: 'preload',
            as: 'image',
            href: buildVideoImageUrl(loaderData.meme.video.bunnyId)
          }
        ]
      }
    }

    return {}
  }
})
