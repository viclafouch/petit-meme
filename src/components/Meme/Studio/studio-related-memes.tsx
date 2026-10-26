import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Label } from '~/components/ui/label'
import type { MemeWithVideo } from '~/constants/meme'
import { buildVideoImageUrl } from '~/lib/bunny'
import { getRelatedMemesQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'

type StudioRelatedMemesProps = {
  meme: Pick<MemeWithVideo, 'id' | 'title'>
}

type StudioRelatedMemesGridProps = {
  memes: MemeWithVideo[]
}

const StudioRelatedMemesGrid = ({ memes }: StudioRelatedMemesGridProps) => {
  return (
    <div className="flex flex-col gap-2.5">
      <Label>{m.studio_try_another_meme()}</Label>
      <div className="grid grid-cols-2 gap-2">
        {memes.map((meme) => {
          return (
            <Link
              key={meme.id}
              to="/memes/$memeId/studio"
              params={{ memeId: meme.id }}
              className="group relative aspect-video overflow-hidden rounded-md border border-border hover:border-primary transition-colors"
            >
              <img
                src={buildVideoImageUrl(meme.video.bunnyId)}
                alt={meme.title}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1">
                <span className="text-caption text-white leading-tight line-clamp-1">
                  {meme.title}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export const StudioRelatedMemes = ({ meme }: StudioRelatedMemesProps) => {
  const relatedMemesQuery = useSuspenseQuery(
    getRelatedMemesQueryOpts({ memeId: meme.id, title: meme.title })
  )

  const filteredMemes = relatedMemesQuery.data.filter((relatedMeme) => {
    return relatedMeme.id !== meme.id
  })

  return filteredMemes.length > 0 ? (
    <StudioRelatedMemesGrid memes={filteredMemes} />
  ) : null
}
