import React from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Clapperboard,
  Clipboard,
  Download,
  Pencil,
  Share2,
  Shuffle
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  getRouteApi,
  Link,
  useLinkProps,
  useRouteContext
} from '@tanstack/react-router'
import { MemeExportMenu } from '~/components/meme/meme-export-menu'
import { MemeLanguageBadge } from '~/components/meme/meme-language-badge'
import { MemeVideoPlayer } from '~/components/meme/meme-video-player'
import { MemesList } from '~/components/meme/memes-list'
import { ToggleBookmarkButton } from '~/components/meme/toggle-bookmark-button'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { useRegisterMemeView } from '~/components/meme/use-register-meme-view'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { formatDate } from '~/helpers/date'
import { matchIsUserAdmin } from '~/helpers/role'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { buildUrl } from '~/lib/seo/url'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { getMemeQueryOpts, listRelatedMemesQueryOpts } from '~/queries/meme'
import { getRandomMeme, recordMemeExport } from '~/server/meme/meme.functions'
import { MemePendingBanner } from './meme-pending-banner'

const memeRouteApi = getRouteApi('/_public__root/_default/memes/$memeId')

type MemeInfoProps = {
  meme: Pick<
    MemeFullData,
    'description' | 'publishedAt' | 'viewCount' | 'contentLocale'
  >
  allTags: string[]
}

const MemeInfo = ({ meme, allTags }: MemeInfoProps) => {
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
        {meme.description !== '' ? (
          <>
            <p className="text-muted-foreground text-xs">{meme.description}</p>
            <hr className="my-2" />
          </>
        ) : null}
        {meme.contentLocale !== 'UNIVERSAL' ? (
          <div className="flex justify-center md:justify-start">
            <MemeLanguageBadge contentLocale={meme.contentLocale} showLabel />
          </div>
        ) : null}
        {meme.publishedAt ? (
          <span className="text-muted-foreground text-xs">
            {m.meme_added_on({
              date: formatDate(new Date(meme.publishedAt), getLocale())
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

type RelatedMemesProps = {
  memes: React.ComponentProps<typeof MemesList>['memes']
}

const RelatedMemes = ({ memes }: RelatedMemesProps) => {
  return (
    <div className="mt-8">
      <h2 className="text-base font-medium mb-4">{m.meme_related()}</h2>
      <MemesList layoutContext="recommend" memes={memes} columnGridCount={4} />
    </div>
  )
}

export const MemePage = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const { memeId } = memeRouteApi.useParams()
  const memeQuery = useSuspenseQuery(getMemeQueryOpts(memeId))
  const relatedMemesQuery = useQuery(
    listRelatedMemesQueryOpts({
      memeId: memeQuery.data.id,
      title: memeQuery.data.title
    })
  )
  const { video, videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: memeQuery.data.id
  })
  const navigate = memeRouteApi.useNavigate()
  const memeLink = useLinkProps({
    to: '/memes/$memeId',
    params: { memeId: memeQuery.data.id }
  })

  useRegisterMemeView({
    memeId: memeQuery.data.id,
    video,
    ratio: 0.3,
    minMs: 2500,
    maxMs: 12_000
  })

  const pauseVideo = () => {
    video?.pause()
  }

  const handleCopyMemeLink = async () => {
    pauseVideo()

    if (memeLink.href === undefined) {
      return
    }

    const text = buildUrl(memeLink.href)

    try {
      await navigator.clipboard.writeText(text)
      void recordMemeExport({
        data: { memeId: memeQuery.data.id, action: 'share' }
      })
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
      return getRandomMeme({ data: { exceptId: memeQuery.data.id } })
    }
  })

  const allTags = React.useMemo(() => {
    return [
      ...new Set([
        ...memeQuery.data.categories.flatMap((category) => {
          return [category.category.title, ...category.category.keywords]
        }),
        ...memeQuery.data.keywords
      ])
    ]
  }, [memeQuery.data])

  const handleNavigateToRandomMeme = () => {
    pauseVideo()
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
        {memeQuery.data.status === MemeStatus.PUBLISHED ? null : (
          <MemePendingBanner memeId={memeQuery.data.id} />
        )}
        <Link
          to="/memes"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="size-5" />
          <span>{m.meme_back_to_memes()}</span>
        </Link>
        <div className="w-full grid md:grid-cols-meme-page gap-x-2.5 gap-y-4">
          <div className="w-full flex flex-col gap-y-2 md:gap-y-2 items-center md:items-start">
            <div className="aspect-video w-full flex relative isolate border rounded-lg border-input overflow-hidden">
              <div className="absolute top-0 left-0 size-full bg-muted/50">
                <img
                  src={buildVideoImageUrl(memeQuery.data.video.bunnyId)}
                  className="blur-2xl size-full opacity-40 object-cover"
                  alt={memeQuery.data.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <MemeVideoPlayer
                ref={videoCallbackRef}
                poster={buildVideoImageUrl(memeQuery.data.video.bunnyId)}
                autoPlay
                showRemainingTime
                playbackFailure={playbackFailure}
                className="dark"
              />
            </div>
            <div className="flex justify-center md:justify-start gap-x-2 items-center">
              <h1 className="font-bricolage text-foreground max-w-4xl text-left font-semibold md:text-balance text-lg leading-heading sm:text-xl lg:text-2xl">
                {memeQuery.data.title}
              </h1>
              <div className="flex">
                <ToggleBookmarkButton size="iconLg" meme={memeQuery.data} />
                {user && matchIsUserAdmin(user) ? (
                  <Link
                    className={buttonVariants({
                      size: 'iconLg',
                      variant: 'ghost'
                    })}
                    to="/admin/library/$memeId"
                    params={{ memeId: memeQuery.data.id }}
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
                params={{ memeId: memeQuery.data.id }}
                className={cn(buttonVariants({ variant: 'default' }))}
                onClick={pauseVideo}
              >
                <Clapperboard />
                {m.meme_open_studio()}
              </Link>
              <div className="flex gap-2 flex-wrap">
                <MemeExportMenu
                  onExport={(format) => {
                    pauseVideo()
                    shareMutation.trigger(memeQuery.data, format)
                  }}
                  render={
                    <Button
                      disabled={shareMutation.isPending}
                      variant="outline"
                      className="md:hidden shrink-0 flex-1"
                    />
                  }
                >
                  <Share2 />
                  {m.meme_share()}
                  <ChevronDown className="text-muted-foreground" />
                </MemeExportMenu>
                <MemeExportMenu
                  onExport={(format) => {
                    pauseVideo()
                    downloadMutation.trigger(memeQuery.data, format)
                  }}
                  render={
                    <Button
                      disabled={downloadMutation.isPending}
                      variant="outline"
                      className="flex-1 shrink-0"
                    />
                  }
                >
                  <Download />
                  {m.meme_download()}
                  <ChevronDown className="text-muted-foreground" />
                </MemeExportMenu>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  void handleCopyMemeLink()
                }}
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
            <MemeInfo meme={memeQuery.data} allTags={allTags} />
          </div>
        </div>
      </div>
      {relatedMemesQuery.data && relatedMemesQuery.data.length > 0 ? (
        <RelatedMemes memes={relatedMemesQuery.data} />
      ) : null}
    </div>
  )
}
