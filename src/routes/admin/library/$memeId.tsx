/* eslint-disable unicorn/filename-case */
import React from 'react'
import { formatDate } from 'date-fns'
import { ExternalLink, Pen, Trash } from 'lucide-react'
import { DeleteMemeButton } from '@/components/admin/delete-meme-button'
import { Dialog } from '@/components/animate-ui/radix/dialog'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { MemeStatusMeta } from '@/constants/meme'
import { formatViewCount } from '@/helpers/format'
import {
  getAdminMemeByIdQueryOpts,
  getAdminMemesListQueryOpts
} from '@/lib/queries'
import { buildMemeSeo } from '@/lib/seo'
import { MemeForm } from '@/routes/admin/library/-components/meme-form'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

const RouteComponent = () => {
  const { memeId } = Route.useParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const memeQuery = useSuspenseQuery(getAdminMemeByIdQueryOpts(memeId))

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    void queryClient.invalidateQueries({
      queryKey: getAdminMemesListQueryOpts.all,
      exact: false
    })
    void queryClient.invalidateQueries(
      getAdminMemeByIdQueryOpts(memeQuery.data.id)
    )
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
            >
              <ExternalLink className="inline" />
            </Link>
          </>
        }
        description={
          <div className="flex flex-col gap-y-2">
            <span className="text-sm text-muted-foreground">
              {formatViewCount(memeQuery.data.viewCount)} -{' Ajouté le '}
              {formatDate(memeQuery.data.createdAt, 'dd/MM/yyyy')}
              {' - '}
              <Badge
                variant={MemeStatusMeta[memeQuery.data.status].badgeVariant}
                size="sm"
              >
                {MemeStatusMeta[memeQuery.data.status].label}
              </Badge>
            </span>
            <div className="flex gap-2">
              {memeQuery.data.categories.map(({ category }) => {
                return (
                  <Badge variant="secondary" key={category.id}>
                    {category.title}
                  </Badge>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {memeQuery.data.keywords.map((keyword) => {
                return (
                  <Badge variant="outline" key={keyword}>
                    {keyword}
                  </Badge>
                )
              })}
            </div>
          </div>
        }
        action={
          <>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  return setIsEditDialogOpen(true)
                }}
              >
                <Pen /> Modifier
              </Button>
              <DeleteMemeButton size="sm" meme={memeQuery.data}>
                <Trash /> Supprimer
              </DeleteMemeButton>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le mème</DialogTitle>
                  <DialogDescription />
                </DialogHeader>
                <MemeForm
                  meme={memeQuery.data}
                  onSuccess={handleEditSuccess}
                  onCancel={() => {
                    return setIsEditDialogOpen(false)
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        }
      />
      <div className="py-10">
        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg text-sm border border-white/10">
          <iframe
            src={`https://iframe.mediadelivery.net/embed/471900/${memeQuery.data.video.bunnyId}?autoplay=false&loop=false&muted=true&preload=true&responsive=true`}
            title={memeQuery.data.title}
            className="size-full"
            allow="autoplay; fullscreen"
          />
        </div>
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

    return {
      meme
    }
  },
  head: ({ loaderData }) => {
    if (loaderData?.meme) {
      return buildMemeSeo(loaderData.meme, { isAdmin: true })
    }

    return {}
  }
})
