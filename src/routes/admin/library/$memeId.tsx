/* eslint-disable unicorn/filename-case */
import { ExternalLink, Trash } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { MemeStatusMeta } from '@/constants/meme'
import { formatDate } from '@/helpers/date'
import { buildIframeVideoUrl } from '@/lib/bunny'
import { buildMemeSeo } from '@/lib/seo'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { MemeForm } from '@/routes/admin/library/-components/meme-form'
import { MemeWatermarkSection } from '@/routes/admin/library/-components/meme-watermark-section'
import { DeleteMemeButton } from '@admin/-components/delete-meme-button'
import {
  getAdminDashboardTotalsQueryOpts,
  getAdminMemeByIdQueryOpts,
  getAdminMemesListQueryOpts
} from '@admin/-lib/queries'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

const RouteComponent = () => {
  const { memeId } = Route.useParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const locale = getLocale()
  const memeQuery = useSuspenseQuery(getAdminMemeByIdQueryOpts(memeId))

  const handleEditSuccess = () => {
    void queryClient.invalidateQueries({
      queryKey: getAdminMemesListQueryOpts.all,
      exact: false
    })
    void queryClient.invalidateQueries(
      getAdminMemeByIdQueryOpts(memeQuery.data.id)
    )
    void queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all
    })
    void router.invalidate()
  }

  return (
    <Container>
      <PageHeader
        title={
          <>
            {memeQuery.data.title}{' '}
            <Link
              className={buttonVariants({ size: 'icon', variant: 'ghost' })}
              to="/memes/$memeId"
              params={{ memeId: memeQuery.data.id }}
              aria-label={`Voir ${memeQuery.data.title} sur le site`}
            >
              <ExternalLink className="inline" aria-hidden />
            </Link>
          </>
        }
        description={
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              {m.meme_views({ count: memeQuery.data.viewCount })}
              {' • '}
              {m.meme_bookmarks({ count: memeQuery.data._count.bookmarkedBy })}
              {' - Ajouté le '}
              {formatDate(memeQuery.data.createdAt, locale)}
              {' - '}
              <Badge
                variant={MemeStatusMeta[memeQuery.data.status].badgeVariant}
                size="sm"
              >
                {MemeStatusMeta[memeQuery.data.status].label}
              </Badge>
            </span>
          </div>
        }
        action={
          <DeleteMemeButton size="sm" meme={memeQuery.data}>
            <Trash /> Supprimer
          </DeleteMemeButton>
        }
      />
      <div className="py-10 flex flex-col gap-8">
        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg border border-white/10">
          <iframe
            src={`${buildIframeVideoUrl(memeQuery.data.video.bunnyId)}?autoplay=false&loop=false&muted=true&preload=true&responsive=true`}
            title={memeQuery.data.title}
            className="size-full"
            allow="autoplay; fullscreen"
          />
        </div>
        <MemeWatermarkSection memeId={memeQuery.data.id} />
        <MemeForm meme={memeQuery.data} onSuccess={handleEditSuccess} />
      </div>
    </Container>
  )
}

export const Route = createFileRoute('/admin/library/$memeId')({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.ensureQueryData(
      getAdminMemeByIdQueryOpts(params.memeId)
    )

    return { meme }
  },
  head: ({ loaderData }) => {
    if (loaderData?.meme) {
      return buildMemeSeo(loaderData.meme, { isAdmin: true })
    }

    return {}
  }
})
