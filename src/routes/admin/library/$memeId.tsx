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
import { getAdminMemesListQueryOpts, getMemeByIdQueryOpts } from '@/lib/queries'
import { buildMemeSeo } from '@/lib/seo'
import { MemeForm } from '@/routes/admin/library/-components/meme-form'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

const RouteComponent = () => {
  const { memeId } = Route.useParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const memeQuery = useSuspenseQuery(getMemeByIdQueryOpts(memeId))
  const meme = memeQuery.data

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    void queryClient.invalidateQueries({
      queryKey: getAdminMemesListQueryOpts.all,
      exact: false
    })
    void queryClient.invalidateQueries(getMemeByIdQueryOpts(meme.id))
    void router.invalidate()
  }

  return (
    <Container>
      <PageHeader
        title={
          <>
            {meme.title}{' '}
            <Link
              className={buttonVariants({ size: 'icon', variant: 'ghost' })}
              to="/memes/$memeId"
              params={{ memeId: meme.id }}
            >
              <ExternalLink className="inline" />
            </Link>
          </>
        }
        description={
          <div className="flex flex-col gap-y-2">
            <span className="text-sm text-gray-500">
              {`${meme.viewCount} vue${meme.viewCount > 1 ? 's' : ''}`} -
              {' Ajouté le '}
              {formatDate(meme.createdAt, 'dd/MM/yyyy')}
              {' - '}
              <Badge
                variant={MemeStatusMeta[meme.status].badgeVariant}
                size="sm"
              >
                {MemeStatusMeta[meme.status].label}
              </Badge>
            </span>
            <div className="flex gap-2">
              {meme.categories.map(({ category }) => {
                return (
                  <Badge variant="secondary" key={category.id}>
                    {category.title}
                  </Badge>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {meme.keywords.map((keyword, index) => {
                return (
                  <Badge variant="outline" key={index}>
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
              <DeleteMemeButton size="sm" meme={meme}>
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
                  meme={meme}
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
            src={`https://iframe.mediadelivery.net/embed/471900/${meme.video.bunnyId}?autoplay=false&loop=false&muted=true&preload=true&responsive=true`}
            title={meme.title}
            className="w-full h-full"
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
      getMemeByIdQueryOpts(params.memeId)
    )

    return {
      meme
    }
  },
  head: ({ loaderData }) => {
    if (loaderData?.meme) {
      return {
        meta: [...buildMemeSeo(loaderData.meme, { isAdmin: true })]
      }
    }

    return {}
  }
})
